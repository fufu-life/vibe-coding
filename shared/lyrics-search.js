(function initMusicalLyricsSearch(globalScope) {
  const DEFAULT_LIMIT = 100;

  function normalizeWithMap(value) {
    const source = String(value || "");
    const characters = [];
    const map = [];
    let offset = 0;

    for (const originalCharacter of source) {
      const start = offset;
      offset += originalCharacter.length;
      const decomposed = originalCharacter.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      for (const character of decomposed) {
        if (/[’']/u.test(character)) continue;
        if (/[\p{L}\p{N}]/u.test(character)) {
          for (const normalizedCharacter of character.toLowerCase()) {
            characters.push(normalizedCharacter);
            map.push({ start, end: offset });
          }
        } else if (characters.length && characters[characters.length - 1] !== " ") {
          characters.push(" ");
          map.push({ start, end: offset });
        }
      }
    }

    while (characters[0] === " ") {
      characters.shift();
      map.shift();
    }
    while (characters[characters.length - 1] === " ") {
      characters.pop();
      map.pop();
    }
    return { text: characters.join(""), map };
  }

  function normalizeSearchText(value) {
    return normalizeWithMap(value).text.replace(/\s+/g, " ").trim();
  }

  function buildIndex(songs, options = {}) {
    const getSongId = options.getSongId || ((song) => song.id);
    const getSongOrder = options.getSongOrder || ((song) => Number(song.order) || 0);
    const getSongTitle = options.getSongTitle || ((song) => song.title || "");
    const getSongTitleSecondary = options.getSongTitleSecondary || ((song) => song.titleZh || "");
    const getLines = options.getLines || ((song) => song.lines || []);
    const getLineId = options.getLineId || ((line) => line.id);
    const getLinePrimary = options.getLinePrimary || ((line) => line.original || line.en || "");
    const getLineSecondary = options.getLineSecondary || ((line) => line.zh || line.en || "");
    const records = [];

    (songs || []).forEach((song) => {
      const songId = getSongId(song);
      const songOrder = getSongOrder(song);
      const songTitle = String(getSongTitle(song) || "");
      const songTitleSecondary = String(getSongTitleSecondary(song) || "");
      records.push({
        type: "title",
        songId,
        songOrder,
        songTitle,
        songTitleSecondary,
        lineId: "",
        lineIndex: 0,
        primary: songTitle,
        secondary: songTitleSecondary,
        fields: [normalizeSearchText(songTitle), normalizeSearchText(songTitleSecondary)].filter(Boolean),
      });

      getLines(song).forEach((line, index) => {
        const primary = String(getLinePrimary(line) || "");
        const secondary = String(getLineSecondary(line) || "");
        records.push({
          type: "line",
          songId,
          songOrder,
          songTitle,
          songTitleSecondary,
          lineId: getLineId(line),
          lineIndex: index + 1,
          primary,
          secondary,
          fields: [normalizeSearchText(primary), normalizeSearchText(secondary)].filter(Boolean),
        });
      });
    });
    return records;
  }

  function hasTokenPrefix(field, token) {
    return field.split(" ").some((word) => word.startsWith(token));
  }

  function directScore(record, query, tokens) {
    let best = 0;
    record.fields.forEach((field, fieldIndex) => {
      if (!field) return;
      if (record.type === "title" && field === query) best = Math.max(best, 1000 - fieldIndex * 20);
      if (field.includes(query)) best = Math.max(best, (record.type === "title" ? 850 : 700) - fieldIndex * 20);
    });
    const combined = record.fields.join(" ");
    if (tokens.every((token) => combined.includes(token))) best = Math.max(best, record.type === "title" ? 620 : 520);
    if (tokens.every((token) => record.fields.some((field) => hasTokenPrefix(field, token)))) {
      best = Math.max(best, record.type === "title" ? 480 : 380);
    }
    return best;
  }

  function editDistanceAtMostOne(left, right) {
    if (left === right) return true;
    if (Math.abs(left.length - right.length) > 1) return false;
    let leftIndex = 0;
    let rightIndex = 0;
    let edits = 0;
    while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex] === right[rightIndex]) {
        leftIndex += 1;
        rightIndex += 1;
        continue;
      }
      edits += 1;
      if (edits > 1) return false;
      if (left.length > right.length) leftIndex += 1;
      else if (right.length > left.length) rightIndex += 1;
      else {
        leftIndex += 1;
        rightIndex += 1;
      }
    }
    return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
  }

  function fuzzyScore(record, tokens) {
    if (!tokens.length || tokens.some((token) => token.length < 4 || /[^a-z0-9]/.test(token))) return 0;
    const words = record.fields.flatMap((field) => field.split(" ")).filter(Boolean);
    return tokens.every((token) => words.some((word) => editDistanceAtMostOne(token, word)))
      ? (record.type === "title" ? 220 : 160)
      : 0;
  }

  function sortMatches(left, right) {
    return right.score - left.score
      || left.record.songOrder - right.record.songOrder
      || left.record.lineIndex - right.record.lineIndex;
  }

  function searchIndex(index, queryValue, { limit = DEFAULT_LIMIT } = {}) {
    const query = normalizeSearchText(queryValue);
    if (!query) return { query: "", mode: "empty", results: [], total: 0, songCount: 0, truncated: false };
    const tokens = query.split(" ").filter(Boolean);
    let matches = index
      .map((record) => ({ record, score: directScore(record, query, tokens) }))
      .filter((match) => match.score > 0);
    let mode = "direct";

    if (!matches.length) {
      mode = "fuzzy";
      matches = index
        .map((record) => ({ record, score: fuzzyScore(record, tokens) }))
        .filter((match) => match.score > 0);
    }

    matches.sort(sortMatches);
    return {
      query,
      mode,
      results: matches.slice(0, limit).map((match) => match.record),
      total: matches.length,
      songCount: new Set(matches.map((match) => match.record.songId)).size,
      truncated: matches.length > limit,
    };
  }

  function getHighlightRanges(value, queryValue) {
    const normalized = normalizeWithMap(value);
    const query = normalizeSearchText(queryValue);
    if (!normalized.text || !query) return [];
    const needles = normalized.text.includes(query) ? [query] : query.split(" ").filter(Boolean);
    const ranges = [];

    needles.forEach((needle) => {
      let startAt = 0;
      while (startAt < normalized.text.length) {
        const index = normalized.text.indexOf(needle, startAt);
        if (index < 0) break;
        const first = normalized.map[index];
        const last = normalized.map[index + needle.length - 1];
        if (first && last) ranges.push({ start: first.start, end: last.end });
        startAt = index + Math.max(needle.length, 1);
      }
    });

    return ranges
      .sort((left, right) => left.start - right.start || left.end - right.end)
      .reduce((merged, range) => {
        const previous = merged[merged.length - 1];
        if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
        else merged.push({ ...range });
        return merged;
      }, []);
  }

  const api = {
    DEFAULT_LIMIT,
    buildIndex,
    editDistanceAtMostOne,
    getHighlightRanges,
    normalizeSearchText,
    searchIndex,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.MusicalLyricsSearch = api;
})(typeof window !== "undefined" ? window : globalThis);
