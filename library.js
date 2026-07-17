(function () {
  const groupsRoot = document.querySelector("#languageGroups");
  const countNode = document.querySelector("#showCount");

  function appendCoverTitle(cover, show) {
    if (show.image) {
      const image = document.createElement("img");
      image.className = "show-logo";
      image.src = show.image;
      image.alt = "";
      cover.append(image);
      return;
    }

    const title = document.createElement("div");
    title.className = "cover-title";
    const strong = document.createElement("strong");
    show.coverLines.forEach((line, index) => {
      if (index > 0) strong.append(document.createElement("br"));
      strong.append(document.createTextNode(line));
    });
    const originalTitle = document.createElement("span");
    originalTitle.textContent = show.originalTitle;
    title.append(strong, originalTitle);
    cover.append(title);
  }

  function createCard(show) {
    const card = document.createElement("a");
    card.className = `show-card ${show.cardClass}`;
    card.href = show.href;

    const cover = document.createElement("div");
    cover.className = "cover";
    cover.setAttribute("aria-hidden", "true");
    appendCoverTitle(cover, show);

    const copy = document.createElement("div");
    copy.className = "show-copy";
    const meta = document.createElement("span");
    meta.className = "show-meta";
    meta.textContent = show.meta.join(" / ");
    const title = document.createElement("strong");
    title.textContent = show.title;
    copy.append(meta, title);
    card.append(cover, copy);
    return card;
  }

  function createGroup(language, shows) {
    const section = document.createElement("section");
    section.className = "language-group";
    section.setAttribute("aria-labelledby", `${language.id}-heading`);

    const heading = document.createElement("div");
    heading.className = "language-heading";
    const title = document.createElement("h2");
    title.id = `${language.id}-heading`;
    title.textContent = language.label;
    const count = document.createElement("span");
    count.textContent = `${shows.length} 部`;
    heading.append(title, count);

    const displayCase = document.createElement("div");
    displayCase.className = "display-case";
    const collection = document.createElement("div");
    collection.className = "collection";
    collection.append(...shows.map(createCard));
    displayCase.append(collection);
    section.append(heading, displayCase);
    return section;
  }

  async function pageExists(show) {
    if (window.location.protocol === "file:") return true;

    try {
      const response = await fetch(show.href, { method: "HEAD", cache: "no-store" });
      return response.ok;
    } catch (_error) {
      return false;
    }
  }

  async function renderLibrary() {
    const availability = await Promise.all(window.libraryShows.map(pageExists));
    const availableShows = window.libraryShows.filter((_show, index) => availability[index]);

    countNode.textContent = String(availableShows.length);
    const groups = window.libraryLanguages.flatMap((language) => {
      const shows = availableShows.filter((show) => show.language === language.id);
      return shows.length ? [createGroup(language, shows)] : [];
    });
    groupsRoot.replaceChildren(...groups);
  }

  renderLibrary();
})();
