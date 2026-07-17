const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const { libraryShows } = require(path.join(root, "shows.js"));

function getShowDirectory(show) {
  return show.id === "hamilton" ? "Hamilton" : show.id;
}

function readShowFiles(show) {
  const directory = path.join(root, getShowDirectory(show));
  const index = fs.readFileSync(path.join(directory, "index.html"), "utf8");
  const script = show.id === "dazhuangwang"
    ? index
    : fs.readFileSync(path.join(directory, "script.js"), "utf8");
  const style = show.id === "dazhuangwang"
    ? index
    : fs.readFileSync(path.join(directory, "style.css"), "utf8");
  return { index, script, style };
}

function readSongData(show) {
  const directory = path.join(root, getShowDirectory(show));
  if (show.id === "dazhuangwang") {
    return fs.readFileSync(path.join(directory, "index.html"), "utf8");
  }
  return fs.readFileSync(path.join(directory, "songs.js"), "utf8");
}

function readDisplayedLyricText(show) {
  const directory = path.join(root, getShowDirectory(show));
  const sandbox = { window: {} };
  if (show.id === "hamilton") {
    vm.runInNewContext(fs.readFileSync(path.join(directory, "lyrics-data.js"), "utf8"), sandbox);
    return sandbox.window.hamiltonLyricsRows.flatMap((line) => [
      line.song_title,
      line.song_title_zh,
      line.english,
      line.chinese_translation,
    ]).join("\n");
  }
  if (show.id === "dazhuangwang") {
    const index = fs.readFileSync(path.join(directory, "index.html"), "utf8");
    const songsSource = index.match(/const dazhuangwangSongs = (\[[\s\S]*?\]);\s*window\.dazhuangwangSongs/)?.[1];
    assert.ok(songsSource, `${show.id}: displayed lyric data`);
    vm.runInNewContext(`window.dazhuangwangSongs = ${songsSource}`, sandbox);
    return sandbox.window.dazhuangwangSongs.flatMap((song) => [
      song.title,
      song.titleSimplified,
      song.titleTraditional,
      ...song.lines.flatMap((line) => [line.text, line.simplified]),
    ]).join("\n");
  }
  vm.runInNewContext(fs.readFileSync(path.join(directory, "songs.js"), "utf8"), sandbox);
  return sandbox.window.songs.flatMap((song) => [
    song.title,
    song.titleZh,
    song.zhTitle,
    ...song.lines.flatMap((line) => [line.original, line.fr, line.en, line.zh]),
  ]).filter(Boolean).join("\n");
}

test("all twenty show pages load the shared audio guard and expose a playlist button", () => {
  assert.equal(libraryShows.length, 20);
  libraryShows.forEach((show) => {
    const { index, script, style } = readShowFiles(show);
    assert.match(index, /\.\.\/shared\/audio-playback\.js/, `${show.id}: shared audio controller`);
    assert.match(index, /id="songPlayButton"/, `${show.id}: song playlist button`);
    assert.match(index, /playlist-lines-mark/, `${show.id}: non-speaker playlist icon`);
    assert.match(index, /playlist-stop-mark" x="8"/, `${show.id}: centered stop icon`);
    assert.match(script, /MusicalAudio\.createController/, `${show.id}: controller initialization`);
    assert.match(script, /audioController\.runUserAction/, `${show.id}: guarded manual playback`);
    assert.match(script, /audioController\.toggleSequence/, `${show.id}: sequential playback`);
    assert.match(script, /audioController\.stopAll/, `${show.id}: song-change cleanup`);
    assert.match(script, /addEventListener\("ended"/, `${show.id}: event-driven advancement`);
    assert.match(script, /function preloadLineAudio/, `${show.id}: next-line preload`);
    assert.match(script, /function followSequenceCard/, `${show.id}: automatic page following`);
    assert.match(script, /scrollIntoView/, `${show.id}: current line scroll behavior`);
    assert.match(style, /\.song-play-button/, `${show.id}: playlist button styling`);
    assert.match(style, /\.is-sequence-active/, `${show.id}: current-line styling`);
    assert.match(style, /\.is-audio-loading/, `${show.id}: loading feedback`);
  });
});

test("the three independent pages keep their own audio and fallback implementations", () => {
  const hamilton = readShowFiles(libraryShows.find((show) => show.id === "hamilton")).script;
  const rouge = readShowFiles(libraryShows.find((show) => show.id === "rouge-et-noir")).script;
  const dazhuangwang = readShowFiles(libraryShows.find((show) => show.id === "dazhuangwang")).script;

  assert.match(hamilton, /function playLineToEnd/);
  assert.match(hamilton, /speakEnglish\(line\.en, true\)/);
  assert.match(rouge, /function playLineToEnd/);
  assert.match(rouge, /speakFrench\(line\.fr, true\)/);
  assert.match(dazhuangwang, /function playDazhuangwangLineToEnd/);
  assert.match(dazhuangwang, /function speakCantoneseToEnd/);
});

test("all song changes reset the new page to the top", () => {
  libraryShows.forEach((show) => {
    const { script } = readShowFiles(show);
    assert.match(script, /function resetSongScrollPosition/, `${show.id}: scroll reset helper`);
    assert.match(script, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/, `${show.id}: immediate top reset`);
    assert.match(script, /renderCurrentSongWithTransition\(\);\s*resetSongScrollPosition\(\);/, `${show.id}: reset after selecting a song`);
  });
});

test("all playlist buttons stay directly in the inline song-title flow", () => {
  libraryShows.forEach((show) => {
    const { style } = readShowFiles(show);
    assert.match(style, /\.song-title-row\s*\{[\s\S]*?display:\s*block;/, `${show.id}: title row uses normal text flow`);
    assert.match(style, /\.song-title-row h[12]\s*\{[\s\S]*?display:\s*inline;/, `${show.id}: title is inline`);
    assert.match(style, /\.song-play-button\s*\{[\s\S]*?margin-inline-start:\s*0\.32em;/, `${show.id}: button follows the final title character`);
  });
});

test("song display titles do not expose live-performance suffix labels", () => {
  const versionLabel = /(?:"title(?:Zh)?"|"zhTitle"|title(?:Zh)?|zhTitle)\s*:\s*["'`][^"'`\n]*(?:[（(\[［]\s*(?:live|现场)|[-–—]\s*live)/iu;
  libraryShows.forEach((show) => {
    assert.doesNotMatch(readSongData(show), versionLabel, `${show.id}: live/现场 title label`);
  });
});

test("all displayed lyric data avoids OCR acute apostrophes and glued Latin punctuation", () => {
  libraryShows.forEach((show) => {
    const source = readDisplayedLyricText(show);
    assert.ok(source, `${show.id}: displayed lyric data`);
    assert.doesNotMatch(source, /´/u, `${show.id}: OCR acute apostrophe`);
    assert.doesNotMatch(
      source,
      /\p{Script=Latin},\p{Script=Latin}|\p{Script=Latin}[!?;:]\p{Script=Latin}|\p{Ll}\.\p{Script=Latin}|\p{Script=Latin}\.\p{Ll}|\p{Script=Latin}[!?]\(|\)\p{Script=Latin}/u,
      `${show.id}: missing space after Latin punctuation`,
    );
  });
});
