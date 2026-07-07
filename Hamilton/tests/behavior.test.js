const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const indexHtml = fs.readFileSync("Hamilton/index.html", "utf8");
const scriptJs = fs.readFileSync("Hamilton/script.js", "utf8");
const styleCss = fs.readFileSync("Hamilton/style.css", "utf8");
const wordDataJs = fs.existsSync("Hamilton/word-data.js") ? fs.readFileSync("Hamilton/word-data.js", "utf8") : "";
const audioBuilderJs = fs.existsSync("Hamilton/scripts/build-audio.js")
  ? fs.readFileSync("Hamilton/scripts/build-audio.js", "utf8")
  : "";

test("favorites UI and state are fully removed", () => {
  const combined = `${indexHtml}\n${scriptJs}\n${styleCss}`;
  [
    "FAVORITES_KEY",
    "favorite",
    "Favorite",
    "onlyFavorites",
    "songFavorite",
    "song-favorite",
    "song-star",
    "收藏",
  ].forEach((term) => {
    assert.equal(combined.includes(term), false, `found removed favorite term: ${term}`);
  });
});

test("phonetics have a toolbar toggle matching the Chinese toggle behavior", () => {
  assert.match(indexHtml, /data-toggle="showIpa"[^>]*>音标<\/button>/);
  assert.match(scriptJs, /settings:\s*\{\s*showZh:\s*true,\s*showIpa:\s*true,/);
  assert.match(scriptJs, /ipa\.hidden\s*=\s*!state\.settings\.showIpa/);
});

test("hero logo uses the transparent svg asset", () => {
  assert.match(indexHtml, /class="hero-mark" src="assets\/Hamilton-Logo-1\.svg"/);
  assert.doesNotMatch(indexHtml, /Hamilton-Logo\.jpg/);
});

test("page includes the Hamilton quill cursor interaction", () => {
  assert.match(indexHtml, /<canvas id="effectCanvas"/);
  assert.match(styleCss, /#effectCanvas\s*\{/);
  assert.match(styleCss, /cursor:\s*none !important/);
  assert.match(scriptJs, /initQuillCursor\(\)/);
  assert.match(scriptJs, /class GoldSpark/);
  assert.match(scriptJs, /function drawActualQuill/);
  assert.match(scriptJs, /mousemove/);
  assert.match(scriptJs, /mousedown/);
  assert.match(scriptJs, /mouseup/);
});

test("mobile lyric cards keep the line speaker away from the right edge", () => {
  assert.match(styleCss, /@media \(max-width: 860px\)[\s\S]*\.lyric-card\s*\{[\s\S]*padding:\s*14px;/);
  assert.match(styleCss, /@media \(max-width: 860px\)[\s\S]*\.line-actions\s*\{[\s\S]*justify-items:\s*center;/);
  assert.match(styleCss, /@media \(max-width: 860px\)[\s\S]*\.speak-button\s*\{[\s\S]*width:\s*34px;/);
  assert.match(styleCss, /\.en-line\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(styleCss, /\.lyric-word,[\s\S]*\.song-title-word\s*\{[\s\S]*white-space:\s*normal;/);
});

test("song titles and every lyric word use clickable word cards", () => {
  assert.match(scriptJs, /renderSongTitle\(/);
  assert.match(scriptJs, /renderEnglishTokens\(/);
  assert.match(scriptJs, /"song-title-word"/);
  assert.match(scriptJs, /"lyric-word"/);
  assert.match(scriptJs, /className\s*=\s*"popover-speak"/);
  assert.match(scriptJs, /getWordEntry\(/);
  assert.match(styleCss, /\.lyric-word/);
  assert.match(styleCss, /\.song-title-word/);
  assert.match(styleCss, /\.popover-ipa/);
});

test("sentence and word pronunciation prefer local audio files", () => {
  assert.match(scriptJs, /const audioState\s*=\s*\{\s*current:\s*null\s*\}/);
  assert.match(scriptJs, /function renderLine\(song, line\)/);
  assert.match(scriptJs, /renderLine\(song, line\)/);
  assert.match(scriptJs, /playEnglishAudio\(getLineAudioPath\(song, line\), line\.en\)/);
  assert.match(scriptJs, /playEnglishAudio\(getWordAudioPath\(text\), text\)/);
  assert.match(scriptJs, /function playLocalAudio\(src\)/);
  assert.match(scriptJs, /new Audio\(src\)/);
  assert.match(scriptJs, /audio\/lines\/\$\{encodeURIComponent\(song\.id\)\}/);
  assert.match(scriptJs, /audio\/words\/\$\{encodeURIComponent\(key\)\}/);
});

test("local audio build script covers lines and words", () => {
  assert.ok(audioBuilderJs, "Hamilton/scripts/build-audio.js should exist");
  assert.match(audioBuilderJs, /HAMILTON_TTS_VOICE/);
  assert.match(audioBuilderJs, /collectLineJobs/);
  assert.match(audioBuilderJs, /collectWordJobs/);
  assert.match(audioBuilderJs, /audio", "lines"/);
  assert.match(audioBuilderJs, /audio", "words"/);
  assert.match(audioBuilderJs, /espeak-ng/);
  assert.match(audioBuilderJs, /HAMILTON_TTS_SPEED/);
  assert.match(audioBuilderJs, /MIN_AUDIO_BYTES/);
  assert.match(audioBuilderJs, /--list/);
});

test("word cards do not contain placeholder meanings", () => {
  const combined = `${scriptJs}\n${wordDataJs}`;
  [
    "word from the lyric line",
    "暂未收录",
    "not in the local glossary yet",
  ].forEach((term) => {
    assert.equal(combined.includes(term), false, `found placeholder meaning: ${term}`);
  });
});

test("generated word data includes meanings for every entry", () => {
  const sandbox = { window: {} };
  require("node:vm").runInNewContext(wordDataJs, sandbox);
  const entries = Object.entries(sandbox.window.hamiltonWordEntries || {});
  assert.ok(entries.length > 0, "word data should contain entries");
  const missing = entries.filter(([, entry]) => !entry.meaning || !entry.en);
  assert.deepEqual(missing.slice(0, 10), []);
});

test("common do verb forms use lyric-appropriate definitions", () => {
  const sandbox = { window: {} };
  require("node:vm").runInNewContext(wordDataJs, sandbox);
  const does = sandbox.window.hamiltonWordEntries.does;
  assert.ok(does, "does should exist in generated word data");
  assert.match(does.en, /third-person singular of do|auxiliary verb/);
  assert.doesNotMatch(does.en, /Department|Energy|female|mammals|buck/i);
  assert.doesNotMatch(does.meaning, /能源部|雌鹿/);
});

test("generated word data avoids dictionary domain noise", () => {
  assert.doesNotMatch(wordDataJs, /\[(?:计|医|化|经|法)\]/);
  assert.doesNotMatch(wordDataJs, /Adam and Eve/i);
});

test("common function words use lyric-appropriate entries", () => {
  const sandbox = { window: {} };
  require("node:vm").runInNewContext(wordDataJs, sandbox);
  const entries = sandbox.window.hamiltonWordEntries;
  const expected = {
    a: /article|determiner/i,
    am: /be verb|first-person/i,
    are: /be verb|plural/i,
    as: /conjunction|preposition/i,
    at: /preposition/i,
    be: /be verb/i,
    he: /pronoun/i,
    his: /pronoun|possessive/i,
    i: /pronoun/i,
    is: /be verb|third-person/i,
    it: /pronoun/i,
    or: /conjunction/i,
    was: /be verb|past tense/i,
    were: /be verb|past tense/i,
  };
  const wrongSense = /blood group|radioactive|transuranic|arsenic|Samoa|square meters|hospital|programing language|Department|Energy/i;

  Object.entries(expected).forEach(([word, pattern]) => {
    assert.ok(entries[word], `${word} should exist`);
    assert.match(entries[word].en, pattern, `${word} should use a grammar-friendly English definition`);
    assert.doesNotMatch(`${entries[word].meaning}\n${entries[word].en}`, wrongSense, `${word} has a mismatched dictionary sense`);
  });
});

test("context-sensitive Hamilton terms avoid misleading first dictionary senses", () => {
  const sandbox = { window: {} };
  require("node:vm").runInNewContext(wordDataJs, sandbox);
  const entries = sandbox.window.hamiltonWordEntries;
  const expected = {
    "angelica's": /given name/,
    adams: /surname/,
    dropped: /drop/,
    founding: /founding|establishing/,
    got: /get/,
    kid: /child|young person/,
    providence: /divine care|fate|foresight/,
    "self-starter": /proactive|self-motivated/,
    slaves: /slave|enslaved/,
  };
  const wrongSense = /plant|Adam and Eve|drop kick|enzyme|goat|Rhode Island|electric starting motor|Slavs/i;

  Object.entries(expected).forEach(([word, pattern]) => {
    assert.ok(entries[word], `${word} should exist`);
    assert.match(entries[word].en, pattern, `${word} should use the Hamilton lyric sense`);
    assert.doesNotMatch(`${entries[word].meaning}\n${entries[word].en}`, wrongSense, `${word} has a misleading dictionary sense`);
  });
});
