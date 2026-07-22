(function initMusicalPlaybackRate(globalScope) {
  const DEFAULT_RATES = Object.freeze([1, 1.25, 1.5, 2, 3]);

  function formatRate(rate) {
    const value = Number(rate);
    return `${Number.isInteger(value) ? value.toFixed(1) : String(value)}×`;
  }

  function createControl({
    button,
    storageKey,
    rates = DEFAULT_RATES,
    defaultRate = rates[0],
    storage = globalScope.localStorage,
    onChange = () => {},
  } = {}) {
    if (!button) throw new Error("Playback-rate button is required");
    const allowedRates = [...rates].map(Number).filter((rate) => Number.isFinite(rate) && rate > 0);
    if (!allowedRates.length) throw new Error("At least one playback rate is required");

    const fallbackRate = allowedRates.includes(Number(defaultRate)) ? Number(defaultRate) : allowedRates[0];
    let currentRate = fallbackRate;

    try {
      const saved = Number(storage?.getItem(storageKey));
      if (allowedRates.includes(saved)) currentRate = saved;
    } catch {
      currentRate = fallbackRate;
    }

    function updateButton() {
      const index = allowedRates.indexOf(currentRate);
      const nextRate = allowedRates[(index + 1) % allowedRates.length];
      button.textContent = formatRate(currentRate);
      button.dataset.playbackRate = String(currentRate);
      button.setAttribute("aria-label", `播放速度 ${formatRate(currentRate)}；点击切换到 ${formatRate(nextRate)}`);
      button.title = `播放速度：${formatRate(currentRate)}`;
    }

    function setRate(rate, { persist = true } = {}) {
      const nextRate = Number(rate);
      if (!allowedRates.includes(nextRate)) return currentRate;
      const previousRate = currentRate;
      currentRate = nextRate;
      if (persist) {
        try {
          storage?.setItem(storageKey, String(currentRate));
        } catch {
          // The control remains usable when storage is unavailable.
        }
      }
      updateButton();
      if (currentRate !== previousRate) onChange(currentRate, previousRate);
      return currentRate;
    }

    function cycle() {
      const index = allowedRates.indexOf(currentRate);
      return setRate(allowedRates[(index + 1) % allowedRates.length]);
    }

    const handleClick = () => cycle();
    button.addEventListener("click", handleClick);
    updateButton();

    return {
      cycle,
      destroy() {
        button.removeEventListener("click", handleClick);
      },
      getRate: () => currentRate,
      setRate,
    };
  }

  const api = { DEFAULT_RATES, createControl, formatRate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.MusicalPlaybackRate = api;
})(typeof window !== "undefined" ? window : globalThis);
