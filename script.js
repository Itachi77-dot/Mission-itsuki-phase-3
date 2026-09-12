/* =========================
   API ENDPOINTS
========================= */

const JIKAN_API = "https://api.jikan.moe/v4";
const KITSU_API = "https://kitsu.io/api/edge/anime";
const ANILIST_API = "https://graphql.anilist.co";

const API_TIMEOUT = 10000;
const CACHE_TTL = 10 * 60 * 1000;

const animeCache = new Map();


/* =========================
   SEARCH STATE
========================= */

let searchTimer = null;
let searchRequestId = 0;


/* =========================
   CACHE HELPERS
========================= */

function getCachedSearch(key) {

  const entry =
    animeCache.get(key);

  if (!entry) return null;

  if (
    Date.now() - entry.ts >
    CACHE_TTL
  ) {

    animeCache.delete(key);

    return null;
  }

  return entry.data;
}


function setCachedSearch(
  key,
  data
) {

  animeCache.set(key, {
    data,
    ts: Date.now()
  });
}


/* =========================
   FETCH WITH TIMEOUT
========================= */

async function fetchWithTimeout(
  url,
  options = {},
  timeout = API_TIMEOUT
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(() => {

      controller.abort();

    }, timeout);

  try {

    const response =
      await fetch(url, {
        ...options,
        signal: controller.signal
      });

    return response;

  } finally {

    clearTimeout(timer);
  }
}


/* =========================
   TEXT SAFETY
========================= */

function escapeSearchText(text) {

  return String(text).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}


/* =========================
   NORMALIZE ANILIST
========================= */

function normalizeAniListAnime(
  media
) {

  const score =
    media.averageScore
      ? (
          media.averageScore / 10
        ).toFixed(1)
      : null;

  return {

    id:
      "al:" + media.id,

    _anilistId:
      media.id,

    title:
      media.title?.romaji ||
      media.title?.english ||
      "Unknown Anime",

    englishTitle:
      media.title?.english || "",

    japaneseTitle:
      media.title?.native || "",

    image:
      media.coverImage?.large ||
      media.coverImage?.medium ||
      "",

    largeImage:
      media.coverImage?.extraLarge ||
      media.coverImage?.large ||
      "",

    description:
      media.description || "",

    episodes:
      media.episodes || null,

    score:
      score,

    status:
      media.status || "",

    type:
      media.format || "ANIME",

    year:
      media.seasonYear || null,

    genres:
      media.genres || [],

    studios:
      media.studios?.nodes?.map(
        studio => studio.name
      ) || [],

    duration:
      media.duration
        ? media.duration + " min"
        : "",

    source:
      "AniList",

    url:
      media.siteUrl || ""
  };
}


/* =========================
   NORMALIZE JIKAN
========================= */

function normalizeJikanAnime(
  anime
) {

  return {

    id:
      "jk:" + anime.mal_id,

    _malId:
      anime.mal_id,

    title:
      anime.title_english ||
      anime.title ||
      "Unknown Anime",

    englishTitle:
      anime.title_english || "",

    japaneseTitle:
      anime.title_japanese || "",

    image:
      anime.images?.jpg?.large_image_url ||
      anime.images?.jpg?.image_url ||
      "",

    largeImage:
      anime.images?.jpg?.large_image_url ||
      "",

    description:
      anime.synopsis || "",

    episodes:
      anime.episodes || null,

    score:
      anime.score || null,

    status:
      anime.status || "",

    type:
      anime.type || "Anime",

    year:
      anime.year ||
      anime.aired?.prop?.from?.year ||
      null,

    genres:
      anime.genres?.map(
        genre => genre.name
      ) || [],

    studios:
      anime.studios?.map(
        studio => studio.name
      ) || [],

    duration:
      anime.duration || "",

    source:
      "Jikan",

    url:
      anime.url || ""
  };
}


/* =========================
   NORMALIZE KITSU
========================= */

function normalizeKitsuAnime(
  anime
) {

  const attr =
    anime.attributes || {};

  const score =
    attr.averageRating
      ? (
          Number(
            attr.averageRating
          ) / 10
        ).toFixed(1)
      : null;

  return {

    id:
      "kt:" + anime.id,

    _kitsuId:
      anime.id,

    _kitsuSlug:
      attr.slug || "",

    title:
      attr.canonicalTitle ||
      "Unknown Anime",

    englishTitle:
      attr.titles?.en ||
      attr.titles?.en_us ||
      "",

    japaneseTitle:
      attr.titles?.ja_jp ||
      "",

    image:
      attr.posterImage?.large ||
      attr.posterImage?.medium ||
      attr.posterImage?.small ||
      "",

    largeImage:
      attr.posterImage?.large ||
      "",

    description:
      attr.synopsis || "",

    episodes:
      attr.episodeCount || null,

    score:
      score,

    status:
      attr.status || "",

    type:
      attr.subtype || "TV",

    year:
      attr.startDate
        ? new Date(
            attr.startDate
          ).getFullYear()
        : null,

    genres: [],

    studios: [],

    duration:
      attr.episodeLength
        ? attr.episodeLength + " min"
        : "",

    source:
      "Kitsu",

    url:
      attr.slug
        ? `https://kitsu.io/anime/${attr.slug}`
        : ""
  };
}


/* =========================
   OPEN ANIME DETAILS
========================= */

function openAnimeDetails(
  id
) {

  if (!id) {

    console.error(
      "Anime ID missing"
    );

    return;
  }

  console.log(
    "Opening anime with ID:",
    id
  );

  window.location.href =
    "./anime.html?id=" +
    encodeURIComponent(id);
}


/* =========================
   CREATE PREMIUM ANIME CARD
========================= */

function createAnimeCard(
  anime
) {

  let image;
  let title;
  let score;
  let id;
  let type;
  let year;
  let genres = [];


  /* =========================
     RAW JIKAN DATA
  ========================= */

  if (
    anime.mal_id !== undefined
  ) {

    image =
      anime.images?.jpg?.large_image_url ||
      anime.images?.jpg?.image_url ||
      "";

    title =
      anime.title_english ||
      anime.title ||
      "Unknown Anime";

    score =
      anime.score ?? "N/A";

    id =
      "jk:" + anime.mal_id;

    type =
      anime.type ||
      "Anime";

    year =
      anime.year ||
      anime.aired?.prop?.from?.year ||
      "";

    genres =
      anime.genres?.map(
        genre => genre.name
      ) || [];


  /* =========================
     NORMALIZED DATA
  ========================= */

  } else {

    image =
      anime.image || "";

    title =
      anime.title ||
      "Unknown Anime";

    score =
      anime.score ?? "N/A";

    id =
      anime.id || "";

    type =
      anime.type ||
      "Anime";

    year =
      anime.year ||
      "";

    genres =
      Array.isArray(
        anime.genres
      )
        ? anime.genres.map(
            genre =>
              genre?.name ||
              genre
          )
        : [];
  }


  /* =========================
     SAFE VALUES
  ========================= */

  const safeId =
    encodeURIComponent(id);

  const safeTitle =
    escapeSearchText(title);

  const safeImage =
    escapeSearchText(image);

  const safeType =
    escapeSearchText(type);

  const safeYear =
    escapeSearchText(year);


  /* =========================
     GENRE TAGS
     MAXIMUM 2
  ========================= */

  const displayGenres =
    genres
      .filter(Boolean)
      .slice(0, 2)
      .map(
        genre => `
          <span class="anime-genre">
            ${escapeSearchText(genre)}
          </span>
        `
      )
      .join("");


  /* =========================
     RATING
  ========================= */

  const rating =
    score !== null &&
    score !== undefined &&
    score !== "N/A"
      ? `⭐ ${escapeSearchText(score)}`
      : "⭐ N/A";


  /* =========================
     FINAL CARD
  ========================= */

  return `
    <article
      class="anime-card"
      data-anime-id="${safeId}"
      style="cursor:pointer"
    >

      <div class="anime-image-wrapper">

        <img
          class="anime-image"
          src="${safeImage}"
          alt="${safeTitle}"
          loading="lazy"
        >

        <div class="anime-card-rating">
          ${rating}
        </div>

        <div class="anime-card-type">
          ${safeType}
        </div>

      </div>


      <div class="anime-info">

        <h3 class="anime-title">
          ${safeTitle}
        </h3>


        <div class="anime-meta">

          ${
            safeYear
              ? `
                <span>
                  📅 ${safeYear}
                </span>
              `
              : ""
          }


          ${
            displayGenres
              ? `
                <div class="anime-genres">
                  ${displayGenres}
                </div>
              `
              : ""
          }

        </div>

      </div>

    </article>
  `;
}


/* =========================
   KITSU CARD ALIAS
========================= */

function createKitsuCard(
  anime
) {

  return createAnimeCard(
    normalizeKitsuAnime(
      anime
    )
  );
}


/* =========================
   SEARCH — ANILIST
========================= */

async function searchAniList(
  query
) {

  const gql = `
    query ($search: String) {

      Page(perPage: 12) {

        media(
          search: $search,
          type: ANIME
        ) {

          id

          title {
            romaji
            english
            native
          }

          coverImage {
            large
            extraLarge
          }

          description(asHtml: false)

          episodes
          averageScore
          status
          format
          duration

          seasonYear

          genres

          studios {
            nodes {
              name
            }
          }

          siteUrl
        }
      }
    }
  `;


  console.log(
    "Searching AniList:",
    query
  );


  const response =
    await fetchWithTimeout(
      ANILIST_API,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Accept":
            "application/json"
        },

        body:
          JSON.stringify({
            query: gql,

            variables: {
              search: query
            }
          })
      }
    );


  if (!response.ok) {

    throw new Error(
      "AniList error: " +
      response.status
    );
  }


  const json =
    await response.json();


  const items =
    json?.data?.Page?.media ||
    [];


  if (
    items.length === 0
  ) {

    throw new Error(
      "AniList returned no results"
    );
  }


  console.log(
    "AniList returned",
    items.length,
    "results"
  );


  return items.map(
    normalizeAniListAnime
  );
}


/* =========================
   SEARCH — JIKAN
========================= */

async function searchJikan(
  query
) {

  const url =
    JIKAN_API +
    "/anime?q=" +
    encodeURIComponent(query) +
    "&limit=12&sfw=true";


  console.log(
    "Searching Jikan:",
    query
  );


  const response =
    await fetchWithTimeout(
      url
    );


  if (!response.ok) {

    throw new Error(
      "Jikan error: " +
      response.status
    );
  }


  const data =
    await response.json();


  const items =
    data.data || [];


  if (
    items.length === 0
  ) {

    throw new Error(
      "Jikan returned no results"
    );
  }


  console.log(
    "Jikan returned",
    items.length,
    "results"
  );


  return items.map(
    normalizeJikanAnime
  );
}


/* =========================
   SEARCH — KITSU
========================= */

async function searchKitsu(
  query
) {

  const url =
    KITSU_API +
    "?filter[text]=" +
    encodeURIComponent(query) +
    "&page[limit]=12";


  console.log(
    "Searching Kitsu:",
    query
  );


  const response =
    await fetchWithTimeout(
      url
    );


  if (!response.ok) {

    throw new Error(
      "Kitsu error: " +
      response.status
    );
  }


  const data =
    await response.json();


  const items =
    data.data || [];


  if (
    items.length === 0
  ) {

    throw new Error(
      "Kitsu returned no results"
    );
  }


  console.log(
    "Kitsu returned",
    items.length,
    "results"
  );


  return items.map(
    normalizeKitsuAnime
  );
}


/* =========================
   MULTI-PROVIDER SEARCH
   AniList → Jikan → Kitsu
========================= */

async function searchAnimeProviders(
  query
) {

  const cacheKey =
    query
      .trim()
      .toLowerCase();


  const cached =
    getCachedSearch(
      cacheKey
    );


  if (cached) {

    console.log(
      "Cache hit for:",
      cacheKey
    );

    return cached;
  }


  const providers = [

    {
      name: "AniList",

      fn: () =>
        searchAniList(
          query
        )
    },

    {
      name: "Jikan",

      fn: () =>
        searchJikan(
          query
        )
    },

    {
      name: "Kitsu",

      fn: () =>
        searchKitsu(
          query
        )
    }

  ];


  for (
    let i = 0;
    i < providers.length;
    i++
  ) {

    const {
      name,
      fn
    } = providers[i];


    try {

      const results =
        await fn();


      setCachedSearch(
        cacheKey,
        results
      );


      return results;


    } catch (error) {

      const isLast =
        i ===
        providers.length - 1;


      if (!isLast) {

        console.warn(
          `${name} unavailable. ` +
          `Trying ${providers[i + 1].name}...`,
          error.message
        );


      } else {

        console.error(
          "All anime APIs unavailable.",
          error.message
        );
      }
    }
  }


  return null;
}


/* =========================
   SEARCH STATUS
========================= */

function showSearchMessage(
  message,
  type = "normal"
) {

  const results =
    document.getElementById(
      "search-results"
    );


  if (!results) return;


  results.innerHTML = `
    <div class="search-status search-status-${type}">
      ${message}
    </div>
  `;
}


/* =========================
   SEARCH RESULT COUNT
========================= */

function showSearchCount(
  count,
  query
) {

  const results =
    document.getElementById(
      "search-results"
    );


  if (!results) return;


  const countText =
    count === 1
      ? "1 result"
      : `${count} results`;


  results.insertAdjacentHTML(
    "afterbegin",
    `
      <div class="search-result-header">

        <span>
          Results for
          "<strong>
            ${escapeSearchText(query)}
          </strong>"
        </span>

        <span>
          ${countText}
        </span>

      </div>
    `
  );
}


/* =========================
   ADVANCED FILTER HELPERS
========================= */

function getFilterValues() {

  const genreFilter =
    document.getElementById(
      "genre-filter"
    );

  const typeFilter =
    document.getElementById(
      "type-filter"
    );

  const scoreFilter =
    document.getElementById(
      "score-filter"
    );

  const sortFilter =
    document.getElementById(
      "sort-filter"
    );


  return {

    genre:
      genreFilter
        ? genreFilter.value
        : "all",

    type:
      typeFilter
        ? typeFilter.value
        : "all",

    score:
      scoreFilter
        ? Number(
            scoreFilter.value
          )
        : 0,

    sort:
      sortFilter
        ? sortFilter.value
        : "relevance"
  };
}


/* =========================
   NORMALIZE FILTER TEXT
========================= */

function normalizeFilterText(
  value
) {

  return String(
    value || ""
  )
    .toLowerCase()
    .trim()
    .replace(
      /[_-]/g,
      " "
    );
}


/* =========================
   GENRE MATCHING
========================= */

function animeMatchesGenre(
  anime,
  selectedGenre
) {

  if (
    !selectedGenre ||
    selectedGenre === "all"
  ) {

    return true;
  }


  const genres =
    Array.isArray(
      anime.genres
    )
      ? anime.genres
      : [];


  const wanted =
    normalizeFilterText(
      selectedGenre
    );


  return genres.some(
    genre => {

      const genreName =
        normalizeFilterText(
          genre?.name ||
          genre
        );


      return (
        genreName === wanted ||
        genreName.includes(
          wanted
        ) ||
        wanted.includes(
          genreName
        )
      );
    }
  );
}


/* =========================
   TYPE MATCHING
========================= */

function animeMatchesType(
  anime,
  selectedType
) {

  if (
    !selectedType ||
    selectedType === "all"
  ) {

    return true;
  }


  const type =
    normalizeFilterText(
      anime.type
    );


  const wanted =
    normalizeFilterText(
      selectedType
    );


  return (
    type === wanted
  );
}


/* =========================
   SCORE MATCHING
========================= */

function animeMatchesScore(
  anime,
  minimumScore
) {

  if (!minimumScore) {

    return true;
  }


  const score =
    Number(
      anime.score
    );


  if (
    Number.isNaN(score)
  ) {

    return false;
  }


  return (
    score >= minimumScore
  );
}


/* =========================
   APPLY ADVANCED FILTERS
========================= */

function applyAnimeFilters(
  animeList
) {

  if (
    !Array.isArray(
      animeList
    )
  ) {

    return [];
  }


  const filters =
    getFilterValues();


  let filtered =
    animeList.filter(
      anime => {

        return (

          animeMatchesGenre(
            anime,
            filters.genre
          ) &&

          animeMatchesType(
            anime,
            filters.type
          ) &&

          animeMatchesScore(
            anime,
            filters.score
          )

        );
      }
    );


  /* =========================
     SORT RESULTS
  ========================= */

  switch (
    filters.sort
  ) {

    case "score":

      filtered.sort(
        (a, b) =>
          Number(
            b.score || 0
          ) -
          Number(
            a.score || 0
          )
      );

      break;


    case "newest":

      filtered.sort(
        (a, b) =>
          Number(
            b.year || 0
          ) -
          Number(
            a.year || 0
          )
      );

      break;


    case "oldest":

      filtered.sort(
        (a, b) =>
          Number(
            a.year || 9999
          ) -
          Number(
            b.year || 9999
          )
      );

      break;


    case "az":

      filtered.sort(
        (a, b) =>
          String(
            a.title || ""
          ).localeCompare(
            String(
              b.title || ""
            )
          )
      );

      break;


    case "za":

      filtered.sort(
        (a, b) =>
          String(
            b.title || ""
          ).localeCompare(
            String(
              a.title || ""
            )
          )
      );

      break;


    case "relevance":

    default:

      break;
  }


  return filtered;
}


/* =========================
   RENDER FILTERED RESULTS
========================= */

function renderSearchResults(
  anime,
  query
) {

  const results =
    document.getElementById(
      "search-results"
    );


  if (!results) return;


  const filteredAnime =
    applyAnimeFilters(
      anime
    );


  if (
    filteredAnime.length === 0
  ) {

    results.innerHTML = `
      <div class="search-status search-status-empty">

        <div style="
          font-size:32px;
          margin-bottom:8px;
        ">
          😕
        </div>

        <div>
          No anime matches your selected filters.
        </div>

        <button
          type="button"
          id="clear-search-filters-btn"
          style="
            margin-top:14px;
            padding:9px 16px;
            border:none;
            border-radius:9px;
            background:var(--purple);
            color:white;
            font-weight:600;
            cursor:pointer;
          "
        >
          Clear Filters
        </button>

      </div>
    `;


    const clearButton =
      document.getElementById(
        "clear-search-filters-btn"
      );


    if (clearButton) {

      clearButton.addEventListener(
        "click",
        resetSearchFilters
      );
    }


    return;
  }


  results.innerHTML = "";


  showSearchCount(
    filteredAnime.length,
    query
  );


  const cards =
    filteredAnime
      .map(
        createAnimeCard
      )
      .join("");


  results.insertAdjacentHTML(
    "beforeend",
    cards
  );
}


/* =========================
   RE-APPLY CURRENT FILTERS
========================= */

function refreshCurrentSearchResults() {

  const input =
    document.getElementById(
      "search-input"
    );


  if (!input) return;


  const query =
    input.value.trim();


  if (!query) return;


  const cached =
    getCachedSearch(
      query.toLowerCase()
    );


  if (!cached) return;


  renderSearchResults(
    cached,
    query
  );
}


/* =========================
   RESET FILTERS
========================= */

function resetSearchFilters() {

  const genreFilter =
    document.getElementById(
      "genre-filter"
    );

  const typeFilter =
    document.getElementById(
      "type-filter"
    );

  const scoreFilter =
    document.getElementById(
      "score-filter"
    );

  const sortFilter =
    document.getElementById(
      "sort-filter"
    );


  if (genreFilter) {

    genreFilter.value =
      "all";
  }


  if (typeFilter) {

    typeFilter.value =
      "all";
  }


  if (scoreFilter) {

    scoreFilter.value =
      "0";
  }


  if (sortFilter) {

    sortFilter.value =
      "relevance";
  }


  refreshCurrentSearchResults();
}


/* =========================
   OPEN ANIME FROM SEARCH
========================= */

async function searchAndOpenAnime(
  title
) {

  console.log(
    "Finding anime details for:",
    title
  );


  try {

    const results =
      await searchAnimeProviders(
        title
      );


    if (
      results &&
      results.length > 0
    ) {

      openAnimeDetails(
        results[0].id
      );

      return;
    }


    alert(
      "Anime details not found."
    );


  } catch (error) {

    console.error(
      "SEARCH/OPEN ERROR:",
      error
    );


    alert(
      "Unable to open anime details. " +
      "Please try again."
    );
  }
}


/* =========================
   MAIN SEARCH
========================= */

async function searchAnime() {

  const input =
    document.getElementById(
      "search-input"
    );

  const results =
    document.getElementById(
      "search-results"
    );


  if (
    !input ||
    !results
  ) {

    return;
  }


  const query =
    input.value.trim();


  if (!query) {

    searchRequestId++;


    showSearchMessage(
      "🔎 Type an anime name to search."
    );


    return;
  }


  const currentRequest =
    ++searchRequestId;


  showSearchMessage(
    `🔍 Searching for "${escapeSearchText(query)}"...`,
    "loading"
  );


  try {

    const anime =
      await searchAnimeProviders(
        query
      );


    if (
      currentRequest !==
      searchRequestId
    ) {

      return;
    }


    if (!anime) {

      showSearchMessage(
        `
          <div style="
            font-size:32px;
            margin-bottom:8px;
          ">
            ⚠️
          </div>

          <div>
            Unable to load anime right now.
          </div>

          <button
            type="button"
            id="retry-search-btn"
            style="
              margin-top:14px;
              padding:9px 16px;
              border:none;
              border-radius:9px;
              background:var(--purple);
              color:white;
              font-weight:600;
              cursor:pointer;
            "
          >
            🔄 Try Again
          </button>
        `,
        "error"
      );


      const retryButton =
        document.getElementById(
          "retry-search-btn"
        );


      if (retryButton) {

        retryButton.addEventListener(
          "click",
          () => {

            searchAnime();

          }
        );
      }


      return;
    }


    if (
      anime.length === 0
    ) {

      showSearchMessage(
        `
          <div style="
            font-size:32px;
            margin-bottom:8px;
          ">
            😕
          </div>

          <div>
            No anime found for
            "<strong>
              ${escapeSearchText(query)}
            </strong>".
          </div>

          <button
            type="button"
            id="retry-search-btn"
            style="
              margin-top:14px;
              padding:9px 16px;
              border:none;
              border-radius:9px;
              background:var(--purple);
              color:white;
              font-weight:600;
              cursor:pointer;
            "
          >
            🔄 Search Again
          </button>
        `
      );


      const retryButton =
        document.getElementById(
          "retry-search-btn"
        );


      if (retryButton) {

        retryButton.addEventListener(
          "click",
          () => {

            searchAnime();

          }
        );
      }


      return;
    }


    renderSearchResults(
      anime,
      query
    );


  } catch (error) {

    if (
      currentRequest !==
      searchRequestId
    ) {

      return;
    }


    console.error(
      "ADVANCED SEARCH ERROR:",
      error
    );


    showSearchMessage(
      `
        <div style="
          font-size:32px;
          margin-bottom:8px;
        ">
          ⚠️
        </div>

        <div>
          Something went wrong while searching.
        </div>

        <button
          type="button"
          id="retry-search-btn"
          style="
            margin-top:14px;
            padding:9px 16px;
            border:none;
            border-radius:9px;
            background:var(--purple);
            color:white;
            font-weight:600;
            cursor:pointer;
          "
        >
          🔄 Try Again
        </button>
      `,
      "error"
    );


    const retryButton =
      document.getElementById(
        "retry-search-btn"
      );


    if (retryButton) {

      retryButton.addEventListener(
        "click",
        () => {

          searchAnime();

        }
      );
    }
  }
}


/* =========================
   CLEAR SEARCH
========================= */

function clearSearch() {

  const input =
    document.getElementById(
      "search-input"
    );

  const results =
    document.getElementById(
      "search-results"
    );


  if (
    !input ||
    !results
  ) {

    return;
  }


  clearTimeout(
    searchTimer
  );


  searchRequestId++;


  input.value = "";


  showSearchMessage(
    "🔎 Type an anime name to search."
  );


  input.focus();
}


/* =========================
   CREATE CLEAR BUTTON
========================= */

function setupSearchClearButton() {

  const input =
    document.getElementById(
      "search-input"
    );


  if (!input) return;


  if (
    document.getElementById(
      "search-clear-btn"
    )
  ) {

    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.id =
    "search-clear-btn";

  button.type =
    "button";

  button.innerHTML =
    "×";

  button.setAttribute(
    "aria-label",
    "Clear search"
  );

  button.title =
    "Clear search";


  button.style.position =
    "absolute";

  button.style.right =
    "92px";

  button.style.top =
    "50%";

  button.style.transform =
    "translateY(-50%)";

  button.style.width =
    "36px";

  button.style.height =
    "36px";

  button.style.border =
    "none";

  button.style.borderRadius =
    "50%";

  button.style.background =
    "rgba(255,255,255,0.08)";

  button.style.color =
    "#ffffff";

  button.style.fontSize =
    "24px";

  button.style.lineHeight =
    "1";

  button.style.cursor =
    "pointer";

  button.style.display =
    "none";

  button.style.zIndex =
    "5";


  button.addEventListener(
    "click",
    clearSearch
  );


  const parent =
    input.parentElement;


  if (parent) {

    const parentStyle =
      window.getComputedStyle(
        parent
      );


    if (
      parentStyle.position ===
      "static"
    ) {

      parent.style.position =
        "relative";
    }


    parent.appendChild(
      button
    );
  }


  input.addEventListener(
    "input",
    () => {

      button.style.display =
        input.value.trim()
          ? "flex"
          : "none";
    }
  );
}


/* =========================
   LIVE SEARCH
========================= */

function setupAdvancedSearch() {

  const input =
    document.getElementById(
      "search-input"
    );


  if (!input) return;


  input.addEventListener(
    "input",
    () => {

      clearTimeout(
        searchTimer
      );


      const query =
        input.value.trim();


      if (!query) {

        searchRequestId++;


        showSearchMessage(
          "🔎 Type an anime name to search."
        );


        return;
      }


      if (
        query.length < 2
      ) {

        showSearchMessage(
          "⌨️ Keep typing..."
        );


        return;
      }


      searchTimer =
        setTimeout(
          () => {

            searchAnime();

          },
          600
        );
    }
  );
}


/* =========================
   SETUP FILTER CONTROLS
========================= */

function setupFilterControls() {

  const genreFilter =
    document.getElementById(
      "genre-filter"
    );

  const typeFilter =
    document.getElementById(
      "type-filter"
    );

  const scoreFilter =
    document.getElementById(
      "score-filter"
    );

  const sortFilter =
    document.getElementById(
      "sort-filter"
    );

  const resetButton =
    document.getElementById(
      "reset-filters"
    );


  const filters = [

    genreFilter,
    typeFilter,
    scoreFilter,
    sortFilter

  ];


  filters.forEach(
    filter => {

      if (!filter) return;


      filter.addEventListener(
        "change",
        () => {

          refreshCurrentSearchResults();

        }
      );
    }
  );


  if (resetButton) {

    resetButton.addEventListener(
      "click",
      resetSearchFilters
    );
  }
}


/* =========================
   FETCH JIKAN
   Legacy helper
========================= */

async function fetchJikan(
  url
) {

  const response =
    await fetchWithTimeout(
      url
    );


  if (!response.ok) {

    throw new Error(
      "Jikan API Error: " +
      response.status
    );
  }


  return await response.json();
}


/* =========================
   DYNAMIC HERO
========================= */

function loadHero(
  anime
) {

  if (!anime) return;


  const heroBackground =
    document.getElementById(
      "hero-background"
    );

  const heroLabel =
    document.getElementById(
      "hero-label"
    );

  const heroTitle =
    document.getElementById(
      "hero-title"
    );

  const heroText =
    document.getElementById(
      "hero-text"
    );

  const heroScore =
    document.getElementById(
      "hero-score"
    );

  const heroType =
    document.getElementById(
      "hero-type"
    );

  const heroYear =
    document.getElementById(
      "hero-year"
    );

  const heroWatch =
    document.getElementById(
      "hero-watch-btn"
    );

  const heroInfo =
    document.getElementById(
      "hero-info-btn"
    );


  const title =
    anime.title ||
    anime.title_english ||
    "Featured Anime";


  const image =
    anime.image ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    "";


  const score =
    anime.score ??
    "N/A";


  const type =
    anime.type ||
    "Anime";


  const year =
    anime.year ||
    anime.aired?.prop?.from?.year ||
    "Unknown";


  const synopsis =
    anime.description ||
    anime.synopsis ||
    "Discover this amazing anime on ITSUKI ANIMES.";


  const id =
    anime.id ||
    ("jk:" + anime.mal_id);


  if (
    heroBackground &&
    image
  ) {

    heroBackground.style.backgroundImage = `
      linear-gradient(
        90deg,
        rgba(7,7,13,0.98) 0%,
        rgba(7,7,13,0.82) 38%,
        rgba(7,7,13,0.35) 72%,
        rgba(7,7,13,0.15) 100%
      ),
      url("${image}")
    `;


    heroBackground.style.backgroundSize =
      "cover";


    heroBackground.style.backgroundPosition =
      "center";
  }


  if (heroLabel) {

    heroLabel.textContent =
      "✦ FEATURED TODAY";
  }


  if (heroTitle) {

    heroTitle.innerHTML =
      `${escapeSearchText(title)}<span>FEATURED</span>`;
  }


  if (heroText) {

    heroText.textContent =
      synopsis.length > 180
        ? synopsis.substring(0, 180) +
          "..."
        : synopsis;
  }


  if (heroScore) {

    heroScore.textContent =
      `⭐ ${score}`;
  }


  if (heroType) {

    heroType.textContent =
      type;
  }


  if (heroYear) {

    heroYear.textContent =
      year;
  }


  if (
    heroWatch &&
    id
  ) {

    heroWatch.onclick =
      () =>
        openAnimeDetails(
          id
        );
  }


  if (
    heroInfo &&
    id
  ) {

    heroInfo.onclick =
      () =>
        openAnimeDetails(
          id
        );
  }
}


/* =========================
   LOAD HOMEPAGE ANIME
========================= */

async function getAnime(
  endpoint,
  elementId
) {

  const grid =
    document.getElementById(
      elementId
    );


  if (!grid) return;


  grid.innerHTML =
    "<p>Loading anime...</p>";


  try {

    const data =
      await fetchJikan(
        JIKAN_API +
        endpoint
      );


    if (
      !data.data ||
      data.data.length === 0
    ) {

      grid.innerHTML =
        "<p>No anime found.</p>";

      return;
    }


    if (
      elementId ===
      "trending-grid"
    ) {

      loadHero(
        data.data[0]
      );
    }


    grid.innerHTML =
      data.data
        .map(
          createAnimeCard
        )
        .join("");


  } catch (error) {

    console.error(
      "HOME ERROR:",
      error
    );


    grid.innerHTML = `
      <p style="color:#ff8abf;">
        Unable to load anime right now.
        Please try again.
      </p>
    `;
  }
}


/* =========================
   VIEW ALL BUTTONS
========================= */

function setupViewAllButtons() {

  const viewButtons =
    document.querySelectorAll(
      ".view-btn"
    );


  viewButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const section =
            button.closest(
              "section"
            );


          if (!section) return;


          const sectionId =
            section.id;


          if (
            sectionId ===
            "trending"
          ) {

            window.location.href =
              "anime-list.html?type=trending";

          }


          else if (
            sectionId ===
            "popular"
          ) {

            window.location.href =
              "anime-list.html?type=popular";

          }


          else if (
            sectionId ===
            "new"
          ) {

            window.location.href =
              "anime-list.html?type=new";

          }

        }
      );

    }
  );

}


/* =========================
   MOBILE MENU
========================= */

function setupMobileMenu() {

  const menuButton =
    document.querySelector(
      ".menu-btn"
    );

  const menu =
    document.getElementById(
      "mobile-menu"
    );

  const overlay =
    document.getElementById(
      "mobile-menu-overlay"
    );

  const closeButton =
    document.getElementById(
      "mobile-menu-close"
    );

  const mobileSearch =
    document.getElementById(
      "mobile-search-btn"
    );

  const links =
    document.querySelectorAll(
      ".mobile-nav-link"
    );


  if (
    !menu ||
    !overlay
  ) {

    return;
  }


  function openMenu() {

    menu.classList.add(
      "active"
    );

    overlay.classList.add(
      "active"
    );

    document.body.classList.add(
      "menu-open"
    );
  }


  function closeMenu() {

    menu.classList.remove(
      "active"
    );

    overlay.classList.remove(
      "active"
    );

    document.body.classList.remove(
      "menu-open"
    );
  }


  if (menuButton) {

    menuButton.addEventListener(
      "click",
      openMenu
    );
  }


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      closeMenu
    );
  }


  overlay.addEventListener(
    "click",
    closeMenu
  );


  links.forEach(
    link => {

      link.addEventListener(
        "click",
        () => {

          links.forEach(
            item => {

              item.classList.remove(
                "active"
              );
            }
          );


          link.classList.add(
            "active"
          );


          closeMenu();
        }
      );
    }
  );


  if (mobileSearch) {

    mobileSearch.addEventListener(
      "click",
      () => {

        closeMenu();


        const searchOverlay =
          document.getElementById(
            "search-overlay"
          );


        const searchInput =
          document.getElementById(
            "search-input"
          );


        if (searchOverlay) {

          searchOverlay.classList.add(
            "active"
          );
        }


        setTimeout(
          () => {

            if (searchInput) {

              searchInput.focus();
            }

          },
          150
        );
      }
    );
  }


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape"
      ) {

        closeMenu();
      }
    }
  );
}


/* =========================
   INITIALIZE WEBSITE
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /* HOMEPAGE */

    getAnime(
      "/top/anime?limit=10",
      "trending-grid"
    );


    getAnime(
      "/top/anime?limit=10&filter=bypopularity",
      "popular-grid"
    );


    getAnime(
      "/seasons/now?limit=10",
      "new-grid"
    );


    /* SEARCH ELEMENTS */

    const openSearch =
      document.getElementById(
        "open-search"
      );

    const closeSearch =
      document.getElementById(
        "close-search"
      );

    const overlay =
      document.getElementById(
        "search-overlay"
      );

    const searchButton =
      document.getElementById(
        "search-btn"
      );

    const searchInput =
      document.getElementById(
        "search-input"
      );


    /* OPEN SEARCH */

    if (
      openSearch &&
      overlay
    ) {

      openSearch.addEventListener(
        "click",
        () => {

          overlay.classList.add(
            "active"
          );


          setTimeout(
            () => {

              if (searchInput) {

                searchInput.focus();
              }

            },
            100
          );
        }
      );
    }


    /* CLOSE SEARCH */

    if (
      closeSearch &&
      overlay
    ) {

      closeSearch.addEventListener(
        "click",
        () => {

          overlay.classList.remove(
            "active"
          );
        }
      );
    }


    /* SEARCH BUTTON */

    if (searchButton) {

      searchButton.addEventListener(
        "click",
        searchAnime
      );
    }


    /* ENTER KEY */

    if (searchInput) {

      searchInput.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
            "Enter"
          ) {

            clearTimeout(
              searchTimer
            );

            searchAnime();
          }
        }
      );
    }


    /* ADVANCED SEARCH */

    setupAdvancedSearch();


    setupSearchClearButton();


    /* FILTER CONTROLS */

    setupFilterControls();


    /* MOBILE MENU */

    setupMobileMenu();


    /* VIEW ALL BUTTONS */

    setupViewAllButtons();


    /* ANIME CARD CLICK */

    document.addEventListener(
      "click",
      event => {

        const card =
          event.target.closest(
            ".anime-card[data-anime-id]"
          );


        if (!card) return;


        const id =
          decodeURIComponent(
            card.dataset.animeId
          );


        if (id) {

          openAnimeDetails(
            id
          );
        }
      }
    );

  }
);