/* =========================================================
   MISSION ITSUKI
   ITSUKI ANIMES — PREMIUM MY LIST
========================================================= */


/* =========================
   GLOBAL STATE
========================= */

let myListFavorites = [];
let filteredFavorites = [];

let currentSearch = "";
let currentSort = "default";


/* =========================
   GET FAVORITES
========================= */

function getFavorites() {

  try {

    const saved =
      localStorage.getItem("itsukiFavorites");

    if (!saved) {
      return [];
    }

    const favorites =
      JSON.parse(saved);

    return Array.isArray(favorites)
      ? favorites
      : [];

  } catch (error) {

    console.error(
      "Unable to read My List:",
      error
    );

    return [];

  }

}


/* =========================
   SAVE FAVORITES
========================= */

function saveFavorites(favorites) {

  try {

    localStorage.setItem(
      "itsukiFavorites",
      JSON.stringify(favorites)
    );

  } catch (error) {

    console.error(
      "Unable to save My List:",
      error
    );

  }

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================
   NORMALIZE VALUE
========================= */

function normalizeText(value) {

  return String(
    value || ""
  )
    .toLowerCase()
    .trim();

}


/* =========================
   REMOVE FAVORITE
========================= */

function removeFavorite(id) {

  const favorites =
    getFavorites();

  const updatedFavorites =
    favorites.filter(
      anime =>
        String(anime.id) !== String(id)
    );

  saveFavorites(
    updatedFavorites
  );

  myListFavorites =
    updatedFavorites;

  applyFiltersAndRender();

}


/* =========================
   OPEN DETAILS
========================= */

function openAnimeDetails(id) {

  if (!id) {
    return;
  }

  window.location.href =
    "anime.html?id=" +
    encodeURIComponent(id);

}


/* =========================
   CREATE ANIME CARD
========================= */

function createMyListCard(anime) {

  const id =
    anime.id || "";

  const title =
    escapeHTML(
      anime.title ||
      "Unknown Anime"
    );

  const image =
    escapeHTML(
      anime.image ||
      ""
    );

  const score =
    anime.score !== null &&
    anime.score !== undefined &&
    anime.score !== ""
      ? anime.score
      : "N/A";

  const episodes =
    anime.episodes !== null &&
    anime.episodes !== undefined &&
    anime.episodes !== ""
      ? anime.episodes
      : "N/A";

  const year =
    anime.year !== null &&
    anime.year !== undefined &&
    anime.year !== ""
      ? anime.year
      : "N/A";


  return `

    <article
      class="anime-card mylist-card"
      data-anime-id="${escapeHTML(id)}"
    >

      <div class="anime-image-wrapper">

        <img
          class="anime-image"
          src="${image}"
          alt="${title}"
          loading="lazy"
          onerror="
            this.onerror=null;
            this.src='https://placehold.co/300x420/11111b/ffffff?text=No+Image';
          "
        >

      </div>


      <div class="anime-info">

        <h3 class="anime-title">
          ${title}
        </h3>


        <div class="mylist-meta">

          <span>
            ⭐ ${score}
          </span>

          <span>
            🎬 ${episodes} Episodes
          </span>

          <span>
            📅 ${year}
          </span>

        </div>


        <div class="mylist-actions">

          <button
            class="open-details-btn"
            type="button"
            data-action="details"
            data-id="${escapeHTML(id)}"
          >
            View Details
          </button>


          <button
            class="remove-btn"
            type="button"
            data-action="remove"
            data-id="${escapeHTML(id)}"
          >
            Remove ❤️
          </button>

        </div>

      </div>

    </article>

  `;

}


/* =========================
   EMPTY LIST
========================= */

function showEmptyList(grid) {

  grid.innerHTML = `

    <div class="empty-list">

      <div class="empty-icon">
        🤍
      </div>

      <h2>
        Your list is empty
      </h2>

      <p>
        Explore anime and add
        your favorites to My List.
      </p>

      <a
        href="index.html"
        class="watch-btn"
      >
        Explore Anime
      </a>

    </div>

  `;

}


/* =========================
   NO SEARCH RESULTS
========================= */

function showNoResults(grid) {

  grid.innerHTML = `

    <div class="empty-list mylist-no-results">

      <div class="empty-icon">
        🔍
      </div>

      <h2>
        No Anime Found
      </h2>

      <p>
        No anime in your list matches
        your search.
      </p>

      <button
        type="button"
        class="watch-btn"
        id="clear-mylist-search"
      >
        Clear Search
      </button>

    </div>

  `;


  const clearButton =
    document.getElementById(
      "clear-mylist-search"
    );


  if (clearButton) {

    clearButton.addEventListener(
      "click",
      function () {

        const searchInput =
          document.getElementById(
            "mylist-search"
          );

        if (searchInput) {
          searchInput.value = "";
        }

        currentSearch = "";

        applyFiltersAndRender();

      }
    );

  }

}


/* =========================
   SORT FAVORITES
========================= */

function sortFavorites(list) {

  const sorted =
    [...list];


  if (
    currentSort === "name"
  ) {

    sorted.sort(
      (a, b) =>
        normalizeText(a.title)
          .localeCompare(
            normalizeText(b.title)
          )
    );

  }


  else if (
    currentSort === "score"
  ) {

    sorted.sort(
      (a, b) => {

        const scoreA =
          Number(a.score) || 0;

        const scoreB =
          Number(b.score) || 0;

        return scoreB - scoreA;

      }
    );

  }


  else if (
    currentSort === "year"
  ) {

    sorted.sort(
      (a, b) => {

        const yearA =
          Number(a.year) || 0;

        const yearB =
          Number(b.year) || 0;

        return yearB - yearA;

      }
    );

  }


  return sorted;

}


/* =========================
   FILTER FAVORITES
========================= */

function filterFavorites(list) {

  if (!currentSearch) {
    return [...list];
  }


  return list.filter(
    anime => {

      const title =
        normalizeText(
          anime.title
        );

      return title.includes(
        currentSearch
      );

    }
  );

}


/* =========================
   UPDATE COUNTER
========================= */

function updateMyListCount() {

  const countElement =
    document.getElementById(
      "mylist-count"
    );

  if (!countElement) {
    return;
  }


  const total =
    myListFavorites.length;


  countElement.textContent =
    total === 1
      ? "1 Anime"
      : `${total} Anime`;

}


/* =========================
   UPDATE RESULT INFO
========================= */

function updateResultInfo() {

  const resultElement =
    document.getElementById(
      "mylist-result-info"
    );

  if (!resultElement) {
    return;
  }


  const total =
    myListFavorites.length;

  const visible =
    filteredFavorites.length;


  if (total === 0) {

    resultElement.textContent =
      "";

    return;

  }


  if (currentSearch) {

    resultElement.textContent =
      `Showing ${visible} of ${total} anime`;

    return;

  }


  resultElement.textContent =
    `Showing all ${total} anime`;

}


/* =========================
   RENDER LIST
========================= */

function renderMyList(list) {

  const grid =
    document.getElementById(
      "mylist-grid"
    );


  if (!grid) {
    return;
  }


  if (
    list.length === 0
  ) {

    if (
      myListFavorites.length === 0
    ) {

      showEmptyList(grid);

    } else {

      showNoResults(grid);

    }

    return;

  }


  grid.innerHTML =
    list
      .map(createMyListCard)
      .join("");

}


/* =========================
   APPLY SEARCH + SORT
========================= */

function applyFiltersAndRender() {

  const filtered =
    filterFavorites(
      myListFavorites
    );


  filteredFavorites =
    sortFavorites(
      filtered
    );


  updateMyListCount();

  updateResultInfo();

  renderMyList(
    filteredFavorites
  );

}


/* =========================
   SEARCH SETUP
========================= */

function setupSearch() {

  const searchInput =
    document.getElementById(
      "mylist-search"
    );


  if (!searchInput) {
    return;
  }


  searchInput.addEventListener(
    "input",
    function () {

      currentSearch =
        normalizeText(
          this.value
        );

      applyFiltersAndRender();

    }
  );

}


/* =========================
   SORT SETUP
========================= */

function setupSort() {

  const sortSelect =
    document.getElementById(
      "mylist-sort-select"
    );


  if (!sortSelect) {
    return;
  }


  sortSelect.addEventListener(
    "change",
    function () {

      currentSort =
        this.value;

      applyFiltersAndRender();

    }
  );

}


/* =========================
   CARD EVENTS
========================= */

function setupMyListEvents() {

  const grid =
    document.getElementById(
      "mylist-grid"
    );


  if (!grid) {
    return;
  }


  grid.addEventListener(
    "click",
    function (event) {

      const button =
        event.target.closest(
          "button"
        );


      if (!button) {
        return;
      }


      const action =
        button.dataset.action;

      const id =
        button.dataset.id;


      if (!id) {
        return;
      }


      if (
        action === "details"
      ) {

        openAnimeDetails(id);

        return;

      }


      if (
        action === "remove"
      ) {

        removeFavorite(id);

      }

    }
  );

}


/* =========================
   LOAD MY LIST
========================= */

function loadMyList() {

  myListFavorites =
    getFavorites();

  applyFiltersAndRender();

}


/* =========================
   START
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    setupSearch();

    setupSort();

    setupMyListEvents();

    loadMyList();

  }
);