(function initMusicalAudio(globalScope) {
  const MINIMUM_INTERVAL_MS = 800;
  const SEQUENCE_GAP_MS = 500;

  function setButtonBusy(button, busy) {
    if (!button) return;
    button.classList.toggle("is-audio-loading", busy);
    if (busy) {
      button.setAttribute("aria-busy", "true");
    } else {
      button.removeAttribute("aria-busy");
    }
  }

  function setSequenceButton(button, active) {
    if (!button) return;
    button.classList.toggle("is-playing", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "停止连续播放本曲" : "连续播放本曲");
    button.title = active ? "停止连续播放本曲" : "连续播放本曲";
  }

  function createController(options = {}) {
    const minimumIntervalMs = options.minimumIntervalMs ?? MINIMUM_INTERVAL_MS;
    const now = options.now || (() => globalScope.performance.now());
    const delay = options.delay || ((ms) => new Promise((resolve) => globalScope.setTimeout(resolve, ms)));
    const stopCurrent = options.stopCurrent || (() => {});
    let lastAcceptedAt = Number.NEGATIVE_INFINITY;
    let userRequestPending = false;
    let sequenceActive = false;
    let sequenceToken = 0;
    let sequenceButton = null;

    function stopSequence() {
      if (!sequenceActive) return false;
      sequenceActive = false;
      sequenceToken += 1;
      stopCurrent();
      setSequenceButton(sequenceButton, false);
      sequenceButton = null;
      options.onSequenceStateChange?.(false);
      options.onItemClear?.();
      return true;
    }

    function stopAll() {
      if (!stopSequence()) {
        sequenceToken += 1;
        stopCurrent();
        options.onItemClear?.();
      }
    }

    async function runUserAction(button, action) {
      const acceptedAt = now();
      if (userRequestPending || acceptedAt - lastAcceptedAt < minimumIntervalMs) {
        return false;
      }

      lastAcceptedAt = acceptedAt;
      stopSequence();
      userRequestPending = true;
      setButtonBusy(button, true);
      try {
        await action();
        return true;
      } finally {
        userRequestPending = false;
        setButtonBusy(button, false);
      }
    }

    function toggleSequence({
      button,
      items,
      playItem,
      onItemStart,
      onItemEnd,
      onItemError,
      onComplete,
      gapMs = SEQUENCE_GAP_MS,
    }) {
      if (sequenceActive) {
        stopSequence();
        return Promise.resolve(false);
      }

      const acceptedAt = now();
      if (userRequestPending || acceptedAt - lastAcceptedAt < minimumIntervalMs) {
        return Promise.resolve(false);
      }

      lastAcceptedAt = acceptedAt;
      stopCurrent();
      sequenceActive = true;
      sequenceButton = button || null;
      const token = ++sequenceToken;
      setSequenceButton(sequenceButton, true);
      options.onSequenceStateChange?.(true);

      return (async () => {
        for (let index = 0; index < items.length; index += 1) {
          if (!sequenceActive || token !== sequenceToken) break;
          const item = items[index];
          onItemStart?.(item, index, items[index + 1] || null);
          try {
            await playItem(item, index);
          } catch (error) {
            onItemError?.(error, item, index);
          }
          onItemEnd?.(item, index);
          const hasNextItem = index < items.length - 1;
          if (hasNextItem && gapMs > 0 && sequenceActive && token === sequenceToken) {
            await delay(gapMs);
          }
        }

        if (sequenceActive && token === sequenceToken) {
          sequenceActive = false;
          setSequenceButton(sequenceButton, false);
          sequenceButton = null;
          options.onSequenceStateChange?.(false);
          options.onItemClear?.();
          onComplete?.();
        }
        return true;
      })();
    }

    return {
      runUserAction,
      toggleSequence,
      stopSequence,
      stopAll,
      isSequenceActive: () => sequenceActive,
      isUserRequestPending: () => userRequestPending,
    };
  }

  const api = { MINIMUM_INTERVAL_MS, SEQUENCE_GAP_MS, createController };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.MusicalAudio = api;
})(typeof window !== "undefined" ? window : globalThis);
