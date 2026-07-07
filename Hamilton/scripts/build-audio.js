const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const LYRICS_FILE = path.join(ROOT, "lyrics-data.js");
const WORD_DATA_FILE = path.join(ROOT, "word-data.js");
const TEMP_ROOT = path.join(ROOT, ".audio-tmp");
const VOICE = process.env.HAMILTON_TTS_VOICE || "en-us";
const SPEED = process.env.HAMILTON_TTS_SPEED || "150";
const MIN_AUDIO_BYTES = 8192;
const FORCE = process.argv.includes("--force");
const LIST_ONLY = process.argv.includes("--list");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(LYRICS_FILE, "utf8"), context);
vm.runInContext(fs.readFileSync(WORD_DATA_FILE, "utf8"), context);

const rows = context.window.hamiltonLyricsRows || [];
const wordEntries = context.window.hamiltonWordEntries || {};

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/#/, "number")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeToken(token) {
  return String(token)
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function tokenizeEnglish(text) {
  return String(text || "").match(/[A-Za-z]+(?:['’][A-Za-z]+)?(?:-[A-Za-z]+)*/g) || [];
}

function cleanSpeechText(text) {
  return String(text || "").replace(/^[A-Z][A-Z .,'&/-]{1,40}:\s*/, "").trim();
}

function getLineAudioPath(songId, lineId) {
  return path.join(ROOT, "audio", "lines", encodeURIComponent(songId), `${encodeURIComponent(lineId)}.wav`);
}

function getWordAudioPath(key) {
  return path.join(ROOT, "audio", "words", `${encodeURIComponent(key)}.wav`);
}

function collectLineJobs() {
  return rows
    .map((row) => {
      const order = Number(row.song_order);
      const title = row.song_title?.trim();
      const english = cleanSpeechText(row.english);
      const lineIndex = Number(row.line_index);
      if (!Number.isFinite(order) || !title || !english || !Number.isFinite(lineIndex)) return null;

      const songId = slugify(`${String(order).padStart(2, "0")}-${title}`);
      const lineId = `ham-${String(order).padStart(2, "0")}-${String(lineIndex).padStart(3, "0")}`;
      return {
        id: lineId,
        text: english,
        output: getLineAudioPath(songId, lineId),
      };
    })
    .filter(Boolean);
}

function collectWordJobs() {
  const wordsByKey = new Map();

  Object.entries(wordEntries).forEach(([key, entry]) => {
    const normalizedKey = normalizeToken(key);
    const text = entry?.speak || key;
    if (normalizedKey && text) wordsByKey.set(normalizedKey, text);
  });

  rows.forEach((row) => {
    tokenizeEnglish(row.song_title).forEach((token) => {
      const key = normalizeToken(token);
      if (key && !wordsByKey.has(key)) wordsByKey.set(key, token);
    });
    tokenizeEnglish(row.english).forEach((token) => {
      const key = normalizeToken(token);
      if (key && !wordsByKey.has(key)) wordsByKey.set(key, token);
    });
  });

  return [...wordsByKey.entries()].map(([key, text]) => ({
    id: key,
    text: cleanSpeechText(text),
    output: getWordAudioPath(key),
  }));
}

function shouldSkip(file) {
  return !FORCE && fs.existsSync(file) && fs.statSync(file).size >= MIN_AUDIO_BYTES;
}

function run(command, args, id) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed for ${id}: ${result.stderr || result.stdout}`);
  }
}

function assertAudio(file, id) {
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  if (size < MIN_AUDIO_BYTES) {
    throw new Error(`Empty or invalid audio for ${id}: ${file}`);
  }
}

function buildAudio(jobs, label) {
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  jobs.forEach((job) => {
    fs.mkdirSync(path.dirname(job.output), { recursive: true });

    if (shouldSkip(job.output)) {
      skipped += 1;
      return;
    }

    const tempBase = `${label}-${encodeURIComponent(job.id)}`;
    const tempWav = path.join(TEMP_ROOT, `${tempBase}.wav`);
    const tempText = path.join(TEMP_ROOT, `${tempBase}.txt`);

    try {
      fs.writeFileSync(tempText, job.text, "utf8");
      run("espeak-ng", ["-v", VOICE, "-s", SPEED, "-w", tempWav, "-f", tempText], job.id);
      assertAudio(tempWav, job.id);
      fs.renameSync(tempWav, job.output);
      assertAudio(job.output, job.id);
      generated += 1;
      if (generated % 100 === 0) {
        console.log(`${label}: generated ${generated} files...`);
      }
    } catch (error) {
      failed += 1;
      console.error(error.message);
      fs.rmSync(job.output, { force: true });
    } finally {
      fs.rmSync(tempWav, { force: true });
      fs.rmSync(tempText, { force: true });
    }
  });

  console.log(`${label} complete. generated=${generated}, skipped=${skipped}, failed=${failed}`);
  return failed;
}

const lineJobs = collectLineJobs();
const wordJobs = collectWordJobs();

if (LIST_ONLY) {
  console.log(`voice=${VOICE}`);
  console.log(`speed=${SPEED}`);
  console.log(`line_jobs=${lineJobs.length}`);
  console.log(`word_jobs=${wordJobs.length}`);
  process.exit(0);
}

fs.mkdirSync(TEMP_ROOT, { recursive: true });
const failures = buildAudio(lineJobs, "lines") + buildAudio(wordJobs, "words");
fs.rmSync(TEMP_ROOT, { recursive: true, force: true });

console.log(`Audio build complete. voice=${VOICE}, speed=${SPEED}, line_jobs=${lineJobs.length}, word_jobs=${wordJobs.length}`);
if (failures > 0) {
  process.exit(1);
}
