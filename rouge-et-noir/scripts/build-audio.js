const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SONGS_FILE = path.join(ROOT, "songs.js");
const SCRIPT_FILE = path.join(ROOT, "script.js");
const TEMP_ROOT = path.join(ROOT, ".audio-tmp");
const MASTER_ROOT = process.env.MUSICAL_AUDIO_MASTER_ROOT
  || path.resolve(ROOT, "..", "..", "audio-masters", "vibe-coding-current", path.basename(ROOT));
const VOICE = process.env.ROUGE_TTS_VOICE || "Audrey";
const FORCE = process.argv.includes("--force");
const LIST_ONLY = process.argv.includes("--list");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(SONGS_FILE, "utf8"), context);

const songs = context.window.songs || [];

function normalizeFrenchAudioText(text) {
  return String(text || "")
    .normalize("NFC")
    .toLocaleLowerCase("fr-FR")
    .replace(/[’‘`]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function hashFrenchAudioText(text) {
  const normalized = normalizeFrenchAudioText(text);
  let hash = 5381;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(index);
  }

  return `fr-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function getLineAudioPaths(song, line) {
  const relative = path.join("audio", "lines", encodeURIComponent(song.id), encodeURIComponent(line.id));
  return {
    master: path.join(MASTER_ROOT, `${relative}.wav`),
    output: path.join(ROOT, `${relative}.mp3`),
  };
}

function getWordAudioPaths(text) {
  const relative = path.join("audio", "words", hashFrenchAudioText(text));
  return {
    master: path.join(MASTER_ROOT, `${relative}.wav`),
    output: path.join(ROOT, `${relative}.mp3`),
  };
}

function lyricWords(text) {
  return text.match(/\p{L}+(?:['’]\p{L}+)*(?:-\p{L}+)*/gu) || [];
}

function scriptSpeakValues() {
  const source = fs.readFileSync(SCRIPT_FILE, "utf8");
  const values = new Set();
  const pattern = /speak:\s*"([^"]+)"/g;
  let match = pattern.exec(source);

  while (match) {
    values.add(match[1]);
    match = pattern.exec(source);
  }

  return values;
}

function collectLineJobs() {
  const jobs = [];

  songs.forEach((song) => {
    (song.lines || []).forEach((line) => {
      if (!line.fr) return;
      jobs.push({
        id: line.id,
        text: line.fr,
        ...getLineAudioPaths(song, line),
      });
    });
  });

  return jobs;
}

function collectWordJobs() {
  const words = new Set();

  songs.forEach((song) => {
    if (song.title) {
      lyricWords(song.title).forEach((word) => words.add(word));
    }

    Object.values(song.wordGlossary || {}).forEach((entry) => {
      if (entry?.speak) words.add(entry.speak);
    });

    (song.lines || []).forEach((line) => {
      lyricWords(line.fr || "").forEach((word) => words.add(word));
      (line.analysis?.words || []).forEach((word) => {
        if (word.fr) {
          lyricWords(word.fr).forEach((part) => words.add(part));
          words.add(word.fr);
        }
      });
    });
  });

  scriptSpeakValues().forEach((word) => words.add(word));

  return [...words]
    .map(normalizeFrenchAudioText)
    .filter(Boolean)
    .map((text) => ({
      id: hashFrenchAudioText(text),
      text,
      ...getWordAudioPaths(text),
    }));
}

function shouldSkip(file) {
  return !FORCE && fs.existsSync(file) && fs.statSync(file).size > 512;
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
  if (size < 4096) {
    throw new Error(`Empty or invalid audio for ${id}: ${file}`);
  }
}

function assertDelivery(file, id) {
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  if (size < 512) throw new Error(`Empty or invalid MP3 delivery for ${id}: ${file}`);
}

function buildAudio(jobs, label) {
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  jobs.forEach((job) => {
    if (shouldSkip(job.output)) {
      skipped += 1;
      return;
    }

    const tempAiff = path.join(TEMP_ROOT, `${label}-${job.id}.aiff`);
    const tempMp3 = `${job.output}.tmp`;

    try {
      if (FORCE || !fs.existsSync(job.master) || fs.statSync(job.master).size < 4096) {
        fs.mkdirSync(path.dirname(job.master), { recursive: true });
        run("say", ["-v", VOICE, "-o", tempAiff, job.text], job.id);
        assertAudio(tempAiff, job.id);
        run("afconvert", [tempAiff, job.master, "-f", "WAVE", "-d", "LEI16"], job.id);
        assertAudio(job.master, job.id);
      }
      fs.mkdirSync(path.dirname(job.output), { recursive: true });
      run("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-i", job.master,
        "-vn", "-map_metadata", "-1",
        "-ac", "1", "-ar", "22050",
        "-c:a", "libmp3lame", "-b:a", "64k",
        "-f", "mp3", tempMp3,
      ], job.id);
      assertDelivery(tempMp3, job.id);
      fs.renameSync(tempMp3, job.output);
      generated += 1;
      if (generated % 100 === 0) {
        console.log(`${label}: generated ${generated} files...`);
      }
    } catch (error) {
      failed += 1;
      console.error(error.message);
      fs.rmSync(job.output, { force: true });
    } finally {
      fs.rmSync(tempAiff, { force: true });
      fs.rmSync(tempMp3, { force: true });
    }
  });

  console.log(`${label} complete. generated=${generated}, skipped=${skipped}, failed=${failed}`);
  return failed;
}

const lineJobs = collectLineJobs();
const wordJobs = collectWordJobs();

if (LIST_ONLY) {
  console.log(`voice=${VOICE}`);
  console.log(`line_jobs=${lineJobs.length}`);
  console.log(`word_jobs=${wordJobs.length}`);
  process.exit(0);
}

fs.mkdirSync(TEMP_ROOT, { recursive: true });
const failures = buildAudio(lineJobs, "lines") + buildAudio(wordJobs, "words");
fs.rmSync(TEMP_ROOT, { recursive: true, force: true });

console.log(`Audio build complete. voice=${VOICE}, line_jobs=${lineJobs.length}, word_jobs=${wordJobs.length}`);
if (failures > 0) {
  process.exit(1);
}
