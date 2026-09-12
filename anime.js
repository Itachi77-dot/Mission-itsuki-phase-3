/* =========================================================
   MISSION ITSUKI
   ITSUKI ANIMES — PREMIUM ANIME DETAILS ENGINE
   PHASE 3 — STEP 4
   EPISODE SYSTEM + AUTHORIZED WATCH PLAYER
========================================================= */


/* =========================================================
   API ENDPOINTS
========================================================= */

const JIKAN_API =
  "https://api.jikan.moe/v4";

const ANILIST_API =
  "https://graphql.anilist.co";

const KITSU_API =
  "https://kitsu.io/api/edge/anime";

const API_TIMEOUT = 12000;
const MAX_RETRIES = 3;


/* =========================================================
   EPISODE SETTINGS
========================================================= */

const EPISODES_PER_PAGE = 12;

let currentEpisodes = [];
let currentEpisodePage = 1;


/* =========================================================
   AUTHORIZED EPISODE VIDEO SOURCES
   PHASE 3 — STEP 4
========================================================= */

/*
   IMPORTANT:
   Only add videos that you own or have permission
   to embed/stream.

   Supported:

   1. YouTube Embed URL

   2. Direct authorized MP4/video URL

   Example:

   "jk:123:1": {
     type: "youtube",
     url: "https://www.youtube.com/embed/VIDEO_ID"
   }

   OR:

   "jk:123:2": {
     type: "mp4",
     url: "https://your-authorized-server.com/episode-2.mp4"
   }
*/

const AUTHORIZED_EPISODE_VIDEOS = {

  /*
    Example:

    "jk:123:1": {
      type: "youtube",
      url: "https://www.youtube.com/embed/YOUR_VIDEO_ID"
    },

    "jk:123:2": {
      type: "mp4",
      url: "https://your-authorized-server.com/episode-2.mp4"
    }
  */

};


/* =========================================================
   GET ANIME ID
========================================================= */

const params =
  new URLSearchParams(
    window.location.search
  );

const animeId =
  params.get("id");


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   CLEAN DESCRIPTION
========================================================= */

function cleanDescription(value) {

  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();

}


/* =========================================================
   DELAY
========================================================= */

function delay(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


/* =========================================================
   FETCH WITH TIMEOUT
========================================================= */

async function fetchWithTimeout(
  url,
  options = {},
  timeout = API_TIMEOUT
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeout
    );

  try {

    return await fetch(
      url,
      {
        ...options,

        signal:
          controller.signal,

        headers: {
          Accept:
            "application/json",

          ...(options.headers || {})
        }
      }
    );

  } finally {

    clearTimeout(timer);

  }

}


/* =========================================================
   NORMALIZE JIKAN
========================================================= */

function normalizeJikanDetail(
  anime
) {

  const image =
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    "";

  const background =
    anime.images?.jpg?.large_image_url ||
    image;

  return {

    id:
      "jk:" +
      anime.mal_id,

    malId:
      anime.mal_id,

    title:
      anime.title_english ||
      anime.title ||
      "Unknown Anime",

    titleJapanese:
      anime.title_japanese ||
      "",

    image,

    background,

    score:
      anime.score ??
      "N/A",

    scoredBy:
      anime.scored_by ??
      0,

    episodes:
      anime.episodes ??
      "Unknown",

    year:
      anime.year ??
      anime.aired?.prop?.from?.year ??
      "Unknown",

    type:
      anime.type ||
      "Anime",

    status:
      anime.status ||
      "Unknown",

    duration:
      anime.duration ||
      "Unknown",

    synopsis:
      cleanDescription(
        anime.synopsis
      ) ||
      "No description available.",

    genres:
      anime.genres?.map(
        genre =>
          genre.name
      ) || [],

    themes:
      anime.themes?.map(
        theme =>
          theme.name
      ) || [],

    studios:
      anime.studios?.map(
        studio =>
          studio.name
      ) || [],

    trailerUrl:
      anime.trailer?.embed_url ||
      "",

    trailerYoutubeId:
      anime.trailer?.youtube_id ||
      "",

    source:
      "Jikan"

  };

}


/* =========================================================
   NORMALIZE ANILIST
========================================================= */

function normalizeAniListDetail(
  media
) {

  const score =
    media.averageScore
      ? (
          media.averageScore / 10
        ).toFixed(1)
      : "N/A";

  const trailerUrl =
    media.trailer?.site ===
      "youtube" &&
    media.trailer?.id
      ? `https://www.youtube.com/embed/${media.trailer.id}`
      : "";

  const image =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    "";

  return {

    id:
      "al:" +
      media.id,

    anilistId:
      media.id,

    malId:
      media.idMal ||
      null,

    title:
      media.title?.english ||
      media.title?.romaji ||
      media.title?.native ||
      "Unknown Anime",

    titleJapanese:
      media.title?.native ||
      "",

    image,

    background:
      media.bannerImage ||
      image,

    score,

    scoredBy:
      media.popularity ??
      0,

    episodes:
      media.episodes ??
      "Unknown",

    year:
      media.seasonYear ??
      "Unknown",

    type:
      media.format ||
      "Anime",

    status:
      media.status ||
      "Unknown",

    duration:
      media.duration
        ? `${media.duration} min`
        : "Unknown",

    synopsis:
      cleanDescription(
        media.description
      ) ||
      "No description available.",

    genres:
      media.genres ||
      [],

    themes:
      [],

    studios:
      media.studios?.nodes?.map(
        studio =>
          studio.name
      ) || [],

    trailerUrl,

    trailerYoutubeId:
      media.trailer?.id ||
      "",

    source:
      "AniList"

  };

}


/* =========================================================
   NORMALIZE KITSU
========================================================= */

function normalizeKitsuDetail(
  anime
) {

  const attr =
    anime.attributes ||
    {};

  const score =
    attr.averageRating
      ? (
          Number(
            attr.averageRating
          ) / 10
        ).toFixed(1)
      : "N/A";

  const year =
    attr.startDate
      ? new Date(
          attr.startDate
        ).getFullYear()
      : "Unknown";

  const image =
    attr.posterImage?.large ||
    attr.posterImage?.medium ||
    "";

  return {

    id:
      "kt:" +
      anime.id,

    kitsuId:
      anime.id,

    title:
      attr.canonicalTitle ||
      "Unknown Anime",

    titleJapanese:
      attr.titles?.ja_jp ||
      "",

    image,

    background:
      attr.coverImage?.large ||
      attr.coverImage?.original ||
      image,

    score,

    scoredBy:
      0,

    episodes:
      attr.episodeCount ??
      "Unknown",

    year,

    type:
      attr.subtype ||
      "Anime",

    status:
      attr.status ||
      "Unknown",

    duration:
      attr.episodeLength
        ? `${attr.episodeLength} min`
        : "Unknown",

    synopsis:
      cleanDescription(
        attr.synopsis
      ) ||
      "No description available.",

    genres: [],

    themes: [],

    studios: [],

    trailerUrl: "",

    trailerYoutubeId: "",

    source:
      "Kitsu",

    malId:
      null

  };

}


/* =========================================================
   JIKAN BASIC
========================================================= */

async function getJikanBasic(
  malId
) {

  const response =
    await fetchWithTimeout(
      `${JIKAN_API}/anime/${encodeURIComponent(
        malId
      )}`
    );

  if (
    response.status === 429
  ) {

    throw new Error(
      "Jikan API is busy."
    );

  }

  if (!response.ok) {

    throw new Error(
      `Jikan basic error: ${response.status}`
    );

  }

  const data =
    await response.json();

  if (!data?.data) {

    throw new Error(
      "Jikan basic data not found."
    );

  }

  return normalizeJikanDetail(
    data.data
  );

}


/* =========================================================
   JIKAN FULL DETAIL
========================================================= */

async function getJikanDetail(
  malId
) {

  let lastError =
    null;

  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    try {

      const response =
        await fetchWithTimeout(
          `${JIKAN_API}/anime/${encodeURIComponent(
            malId
          )}/full`
        );

      if (
        response.status === 429
      ) {

        lastError =
          new Error(
            "Jikan API is busy."
          );

        if (
          attempt <
          MAX_RETRIES
        ) {

          await delay(
            2000 *
            (attempt + 1)
          );

          continue;

        }

        break;

      }

      if (
        response.status === 404
      ) {

        throw new Error(
          "Anime not found on Jikan."
        );

      }

      if (!response.ok) {

        throw new Error(
          `Jikan error: ${response.status}`
        );

      }

      const data =
        await response.json();

      if (!data?.data) {

        throw new Error(
          "Jikan data not found."
        );

      }

      return normalizeJikanDetail(
        data.data
      );

    } catch (error) {

      lastError =
        error.name ===
        "AbortError"

          ? new Error(
              "Request timed out."
            )

          : error;

      if (
        attempt <
        MAX_RETRIES
      ) {

        await delay(
          1000 *
          (attempt + 1)
        );

      }

    }

  }


  try {

    console.warn(
      "Jikan FULL failed. Trying BASIC endpoint..."
    );

    return await getJikanBasic(
      malId
    );

  } catch (basicError) {

    console.warn(
      "Jikan BASIC also failed:",
      basicError.message
    );

  }

  throw (
    lastError ||
    new Error(
      "Unable to load Jikan anime."
    )
  );

}


/* =========================================================
   ANILIST SEARCH
========================================================= */

async function searchAniListByTitle(
  title
) {

  const gql = `
    query ($search: String) {

      Page(perPage: 5) {

        media(
          search: $search,
          type: ANIME
        ) {

          id

          idMal

          title {
            romaji
            english
            native
          }

          coverImage {
            large
            extraLarge
          }

          bannerImage

          description(
            asHtml: false
          )

          episodes
          averageScore
          popularity
          status
          format
          duration
          seasonYear
          genres

          trailer {
            id
            site
          }

          studios {
            nodes {
              name
            }
          }

        }

      }

    }
  `;

  const response =
    await fetchWithTimeout(
      ANILIST_API,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify({

            query: gql,

            variables: {
              search: title
            }

          })

        }
    );

  if (!response.ok) {

    throw new Error(
      `AniList search error: ${response.status}`
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
      "AniList search returned no results."
    );

  }

  return items.map(
    normalizeAniListDetail
  );

}


/* =========================================================
   ANILIST DETAIL
========================================================= */

async function getAniListDetail(
  anilistId
) {

  const gql = `
    query ($id: Int) {

      Media(
        id: $id,
        type: ANIME
      ) {

        id

        idMal

        title {
          romaji
          english
          native
        }

        coverImage {
          large
          extraLarge
        }

        bannerImage

        description(
          asHtml: false
        )

        episodes
        averageScore
        popularity
        status
        format
        duration
        seasonYear
        genres

        trailer {
          id
          site
        }

        studios {
          nodes {
            name
          }
        }

      }

    }
  `;

  const response =
    await fetchWithTimeout(
      ANILIST_API,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify({

            query: gql,

            variables: {
              id:
                Number(
                  anilistId
                )
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

  const media =
    json?.data?.Media;

  if (!media) {

    throw new Error(
      "AniList data not found."
    );

  }

  return normalizeAniListDetail(
    media
  );

}


/* =========================================================
   KITSU DETAIL
========================================================= */

async function getKitsuDetail(
  kitsuId
) {

  const response =
    await fetchWithTimeout(
      `${KITSU_API}/${encodeURIComponent(
        kitsuId
      )}`
    );

  if (!response.ok) {

    throw new Error(
      "Kitsu error: " +
      response.status
    );

  }

  const json =
    await response.json();

  if (!json?.data) {

    throw new Error(
      "Kitsu data not found."
    );

  }

  return normalizeKitsuDetail(
    json.data
  );

}


/* =========================================================
   JIKAN ID → TITLE
========================================================= */

async function getJikanTitle(
  malId
) {

  const response =
    await fetchWithTimeout(
      `${JIKAN_API}/anime/${encodeURIComponent(
        malId
      )}`
    );

  if (!response.ok) {

    throw new Error(
      `Unable to get Jikan title: ${response.status}`
    );

  }

  const json =
    await response.json();

  const anime =
    json?.data;

  if (!anime) {

    throw new Error(
      "Anime title unavailable."
    );

  }

  return (
    anime.title_english ||
    anime.title ||
    ""
  );

}


/* =========================================================
   ANIME DATA ROUTER
========================================================= */

async function getAnimeData(
  rawId
) {

  if (!rawId) {

    throw new Error(
      "Anime ID missing."
    );

  }

  const idString =
    String(rawId);


  if (
    idString.includes(":")
  ) {

    const separator =
      idString.indexOf(":");

    const prefix =
      idString.slice(
        0,
        separator
      );

    const id =
      idString.slice(
        separator + 1
      );


    if (
      prefix === "al"
    ) {

      return await getAniListDetail(
        id
      );

    }


    if (
      prefix === "kt"
    ) {

      return await getKitsuDetail(
        id
      );

    }


    if (
      prefix === "jk"
    ) {

      try {

        return await getJikanDetail(
          id
        );

      } catch (jikanError) {

        console.warn(
          "Jikan failed:",
          jikanError.message
        );


        let title =
          "";

        try {

          title =
            await getJikanTitle(
              id
            );

        } catch (titleError) {

          console.warn(
            "Could not get fallback title:",
            titleError.message
          );

        }


        if (title) {

          try {

            const results =
              await searchAniListByTitle(
                title
              );

            if (
              results?.length
            ) {

              return results[0];

            }

          } catch (fallbackError) {

            console.warn(
              "AniList title fallback failed:",
              fallbackError.message
            );

          }


          try {

            const url =
              KITSU_API +
              "?filter[text]=" +
              encodeURIComponent(
                title
              ) +
              "&page[limit]=1";

            const response =
              await fetchWithTimeout(
                url
              );

            if (
              response.ok
            ) {

              const json =
                await response.json();

              const item =
                json?.data?.[0];

              if (item) {

                return normalizeKitsuDetail(
                  item
                );

              }

            }

          } catch (kitsuError) {

            console.warn(
              "Kitsu fallback failed:",
              kitsuError.message
            );

          }

        }

        throw jikanError;

      }

    }


    throw new Error(
      "Unsupported anime source."
    );

  }


  try {

    return await getJikanDetail(
      idString
    );

  } catch (error) {

    throw new Error(
      "Unable to load anime details."
    );

  }

}


/* =========================================================
   FAVORITES
========================================================= */

function getFavorites() {

  try {

    const saved =
      localStorage.getItem(
        "itsukiFavorites"
      );

    if (!saved) {

      return [];

    }

    const parsed =
      JSON.parse(
        saved
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];

  } catch (error) {

    console.warn(
      "Favorites could not be read:",
      error
    );

    return [];

  }

}


/* =========================================================
   SAVE FAVORITES
========================================================= */

function saveFavorites(
  favorites
) {

  try {

    localStorage.setItem(
      "itsukiFavorites",
      JSON.stringify(
        favorites
      )
    );

    return true;

  } catch (error) {

    console.error(
      "Unable to save favorites:",
      error
    );

    return false;

  }

}


/* =========================================================
   CHECK FAVORITE
========================================================= */

function isFavorite(
  id
) {

  return getFavorites().some(
    anime =>
      String(
        anime.id
      ) ===
      String(
        id
      )
  );

}


/* =========================================================
   CREATE FAVORITE
========================================================= */

function createFavoriteAnime(
  anime
) {

  return {

    id:
      anime.id,

    title:
      anime.title,

    image:
      anime.image,

    score:
      anime.score,

    episodes:
      anime.episodes,

    type:
      anime.type,

    year:
      anime.year,

    status:
      anime.status

  };

}


/* =========================================================
   TOGGLE FAVORITE
========================================================= */

function toggleFavorite(
  animeData
) {

  let favorites =
    getFavorites();

  const existingIndex =
    favorites.findIndex(
      anime =>
        String(
          anime.id
        ) ===
        String(
          animeData.id
        )
    );

  if (
    existingIndex !== -1
  ) {

    favorites.splice(
      existingIndex,
      1
    );

  } else {

    favorites.push(
      animeData
    );

  }

  saveFavorites(
    favorites
  );

  updateFavoriteButton(
    animeData.id
  );


  const button =
    document.getElementById(
      "favorite-btn"
    );

  if (button) {

    button.classList.remove(
      "favorite-pop"
    );

    void button.offsetWidth;

    button.classList.add(
      "favorite-pop"
    );

  }

}


/* =========================================================
   UPDATE FAVORITE BUTTON
========================================================= */

function updateFavoriteButton(
  id
) {

  const button =
    document.getElementById(
      "favorite-btn"
    );

  if (!button) return;

  if (
    isFavorite(
      id
    )
  ) {

    button.innerHTML =
      "❤️ Added to My List";

    button.classList.add(
      "favorited"
    );

    button.setAttribute(
      "aria-pressed",
      "true"
    );

  } else {

    button.innerHTML =
      "🤍 Add to My List";

    button.classList.remove(
      "favorited"
    );

    button.setAttribute(
      "aria-pressed",
      "false"
    );

  }

}


/* =========================================================
   TRAILER
========================================================= */

function toggleTrailer() {

  const trailer =
    document.getElementById(
      "trailer-container"
    );

  if (!trailer) return;

  trailer.classList.toggle(
    "trailer-active"
  );

  const active =
    trailer.classList.contains(
      "trailer-active"
    );

  if (active) {

    trailer.scrollIntoView({
      behavior:
        "smooth",

      block:
        "center"

    });

  }

}


/* =========================================================
   GENRE HTML
========================================================= */

function createGenreHTML(
  genres
) {

  if (
    !Array.isArray(
      genres
    ) ||
    genres.length === 0
  ) {

    return `
      <span class="detail-genre">
        Genre information unavailable
      </span>
    `;

  }

  return genres
    .slice(
      0,
      8
    )
    .map(
      genre => `
        <span class="detail-genre">
          ${escapeHTML(
            genre
          )}
        </span>
      `
    )
    .join("");

}


/* =========================================================
   STUDIO HTML
========================================================= */

function createStudioHTML(
  studios
) {

  if (
    !Array.isArray(
      studios
    ) ||
    studios.length === 0
  ) {

    return "Information unavailable";

  }

  return studios
    .slice(
      0,
      3
    )
    .map(
      studio =>
        escapeHTML(
          studio
        )
    )
    .join(", ");

}


/* =========================================================
   THEME HTML
========================================================= */

function createThemeHTML(
  themes
) {

  if (
    !Array.isArray(
      themes
    ) ||
    themes.length === 0
  ) {

    return "";

  }

  return themes
    .slice(
      0,
      5
    )
    .map(
      theme => `
        <span class="detail-genre">
          ${escapeHTML(
            theme
          )}
        </span>
      `
    )
    .join("");

}


/* =========================================================
   GET JIKAN EPISODES
========================================================= */

async function getJikanEpisodes(
  malId,
  page = 1
) {

  if (!malId) {

    throw new Error(
      "Episode data is unavailable for this anime."
    );

  }

  const response =
    await fetchWithTimeout(
      `${JIKAN_API}/anime/${encodeURIComponent(
        malId
      )}/episodes?page=${page}`
    );

  if (
    response.status === 429
  ) {

    throw new Error(
      "Jikan API is busy."
    );

  }

  if (!response.ok) {

    throw new Error(
      `Episode API error: ${response.status}`
    );

  }

  const json =
    await response.json();

  return {

    episodes:
      Array.isArray(
        json?.data
      )
        ? json.data
        : [],

    nextPage:
      json?.pagination?.has_next_page
        ? page + 1
        : null,

    hasNextPage:
      Boolean(
        json?.pagination?.has_next_page
      )

  };

}


/* =========================================================
   EPISODE CARD
========================================================= */

function createEpisodeCard(
  episode
) {

  const number =
    escapeHTML(
      String(
        episode.mal_id ??
        episode.episode ??
        "?"
      )
    );

  const title =
    escapeHTML(
      episode.title ||
      `Episode ${number}`
    );

  let aired =
    "Air date unavailable";

  if (
    episode.aired
  ) {

    const date =
      new Date(
        episode.aired
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      aired =
        date.toLocaleDateString(
          "en-IN",
          {
            day:
              "2-digit",

            month:
              "short",

            year:
              "numeric"
          }
        );

    }

  }

  const score =
    episode.score != null
      ? escapeHTML(
          String(
            episode.score
          )
        )
      : "N/A";

  const filler =
    episode.filler
      ? "Filler"
      : "";

  const recap =
    episode.recap
      ? "Recap"
      : "";

  const specialTags =
    [filler, recap]
      .filter(Boolean)
      .map(
        tag => `
          <span class="episode-tag">
            ${escapeHTML(tag)}
          </span>
        `
      )
      .join("");

  return `

    <article
      class="episode-card"
      data-episode="${number}"
      tabindex="0"
      role="button"
      aria-label="Episode ${number}: ${title}"
    >

      <div class="episode-number">

        <span>
          EP
        </span>

        <strong>
          ${number}
        </strong>

      </div>


      <div class="episode-content">

        <h3>
          ${title}
        </h3>


        <div class="episode-meta">

          <span>
            📅 ${escapeHTML(
              aired
            )}
          </span>

          <span>
            ⭐ ${score}
          </span>

          ${specialTags}

        </div>

      </div>


      <div
        class="episode-arrow"
        aria-hidden="true"
      >
        →
      </div>

    </article>

  `;

}


/* =========================================================
   EPISODE CONTAINER
========================================================= */

function getEpisodeContainer() {

  return (
    document.getElementById(
      "episodes-container"
    ) ||
    document.getElementById(
      "episodes-list"
    )
  );

}


/* =========================================================
   RENDER EPISODES
========================================================= */

function renderEpisodes(
  episodes
) {

  const container =
    getEpisodeContainer();

  if (!container) {

    console.warn(
      "Episode container not found."
    );

    return;

  }

  if (
    !Array.isArray(
      episodes
    ) ||
    episodes.length === 0
  ) {

    container.innerHTML = `

      <div class="episodes-empty">

        <div class="episodes-empty-icon">
          📺
        </div>

        <h3>
          Episodes unavailable
        </h3>

        <p>
          Episode information could not be loaded right now.
        </p>

      </div>

    `;

    return;

  }


  const cards =
    episodes
      .map(
        createEpisodeCard
      )
      .join("");


  container.innerHTML = `

    <div class="episodes-grid">

      ${cards}

    </div>


    ${
      window.__itsukiHasMoreEpisodes
        ? `

          <div class="episodes-load-more-wrapper">

            <button
              id="load-more-episodes"
              class="episodes-load-more"
              type="button"
            >
              ＋ Load More Episodes
            </button>

          </div>

        `
        : `

          <div class="episodes-end">

            <span>
              ✓
            </span>

            All available episodes loaded

          </div>

        `
    }

  `;


  const loadMoreButton =
    document.getElementById(
      "load-more-episodes"
    );


  if (
    loadMoreButton
  ) {

    loadMoreButton.addEventListener(
      "click",
      loadMoreEpisodes
    );

  }


  const episodeCards =
    container.querySelectorAll(
      ".episode-card"
    );


  episodeCards.forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          const episodeNumber =
            card.dataset.episode;

          selectEpisode(
            episodeNumber
          );

        }
      );


      card.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {

            event.preventDefault();

            const episodeNumber =
              card.dataset.episode;

            selectEpisode(
              episodeNumber
            );

          }

        }
      );

    }
  );

}


/* =========================================================
   PROFESSIONAL WATCH PLAYER
   PHASE 3 — STEP 4
   AUTHORIZED VIDEO SOURCE SYSTEM
========================================================= */

function selectEpisode(
  episodeNumber
) {

  const player =
    document.getElementById(
      "anime-player"
    );

  const watchSection =
    document.getElementById(
      "watch-section"
    );

  if (!player) {
    return;
  }


  const anime =
    window.__itsukiCurrentAnime ||
    null;


  const safeEpisode =
    escapeHTML(
      String(
        episodeNumber
      )
    );


  const totalEpisodes =
    Number(
      anime?.episodes
    );


  const currentNumber =
    Number(
      episodeNumber
    );


  const hasPrevious =
    currentNumber > 1;


  const hasNext =
    Number.isFinite(
      totalEpisodes
    ) &&
    totalEpisodes > 0 &&
    currentNumber < totalEpisodes;


  /* =====================================================
     SHOW WATCH SECTION
  ===================================================== */

  if (watchSection) {

    watchSection.hidden =
      false;

  }


  /* =====================================================
     FIND AUTHORIZED VIDEO SOURCE
  ===================================================== */

  const animeKey =
    String(
      anime?.id ||
      ""
    );


  const episodeKey =
    `${animeKey}:${String(
      episodeNumber
    )}`;


  const videoSource =
    AUTHORIZED_EPISODE_VIDEOS[
      episodeKey
    ] || null;


  /* =====================================================
     PLAYER CONTENT
  ===================================================== */

  let playerContent = "";


  /* =====================================================
     AUTHORIZED YOUTUBE
  ===================================================== */

  if (
    videoSource &&
    videoSource.type ===
      "youtube" &&
    videoSource.url
  ) {

    const safeVideoUrl =
      escapeHTML(
        videoSource.url
      );


    playerContent = `

      <div class="professional-player">

        <div class="player-screen player-video-screen">

          <iframe
            src="${safeVideoUrl}"
            title="${safeTitleForPlayer(
              anime?.title
            )} Episode ${safeEpisode}"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>

        </div>


        <div class="player-information">

          <div class="player-episode-info">

            <span class="player-episode-label">
              NOW PLAYING
            </span>

            <h3>
              Episode ${safeEpisode}
            </h3>

          </div>


          <div class="player-controls">

            <button
              type="button"
              class="player-control-btn"
              id="previous-episode-btn"
              ${
                hasPrevious
                  ? ""
                  : "disabled"
              }
              aria-label="Previous episode"
            >
              <span>←</span>
              Previous
            </button>


            <button
              type="button"
              class="player-control-btn player-control-next"
              id="next-episode-btn"
              ${
                hasNext
                  ? ""
                  : "disabled"
              }
              aria-label="Next episode"
            >
              Next
              <span>→</span>
            </button>

          </div>

        </div>

      </div>

    `;

  }


  /* =====================================================
     AUTHORIZED MP4
  ===================================================== */

  else if (
    videoSource &&
    videoSource.type ===
      "mp4" &&
    videoSource.url
  ) {

    const safeVideoUrl =
      escapeHTML(
        videoSource.url
      );


    playerContent = `

      <div class="professional-player">

        <div class="player-screen player-video-screen">

          <video
            class="itsuki-video-player"
            controls
            playsinline
            preload="metadata"
          >

            <source
              src="${safeVideoUrl}"
              type="video/mp4"
            >

            Your browser does not support
            HTML5 video.

          </video>

        </div>


        <div class="player-information">

          <div class="player-episode-info">

            <span class="player-episode-label">
              NOW PLAYING
            </span>

            <h3>
              Episode ${safeEpisode}
            </h3>

          </div>


          <div class="player-controls">

            <button
              type="button"
              class="player-control-btn"
              id="previous-episode-btn"
              ${
                hasPrevious
                  ? ""
                  : "disabled"
              }
              aria-label="Previous episode"
            >
              <span>←</span>
              Previous
            </button>


            <button
              type="button"
              class="player-control-btn player-control-next"
              id="next-episode-btn"
              ${
                hasNext
                  ? ""
                  : "disabled"
              }
              aria-label="Next episode"
            >
              Next
              <span>→</span>
            </button>

          </div>

        </div>

      </div>

    `;

  }


  /* =====================================================
     NO AUTHORIZED SOURCE
  ===================================================== */

  else {

    playerContent = `

      <div class="professional-player">

        <div class="player-screen">

          <div class="player-screen-content">

            <div
              class="player-play-icon"
              aria-hidden="true"
            >
              ▶
            </div>

            <span class="player-source-label">
              ITSUKI ANIMES
            </span>

            <h3>
              Episode ${safeEpisode}
            </h3>

            <p>
              Ready to watch
            </p>

            <div class="player-source-status">

              <span
                class="player-status-dot"
              ></span>

              Video source not connected

            </div>

          </div>

        </div>


        <div class="player-information">

          <div class="player-episode-info">

            <span class="player-episode-label">
              NOW SELECTED
            </span>

            <h3>
              Episode ${safeEpisode}
            </h3>

          </div>


          <div class="player-controls">

            <button
              type="button"
              class="player-control-btn"
              id="previous-episode-btn"
              ${
                hasPrevious
                  ? ""
                  : "disabled"
              }
              aria-label="Previous episode"
            >
              <span>←</span>
              Previous
            </button>


            <button
              type="button"
              class="player-control-btn player-control-next"
              id="next-episode-btn"
              ${
                hasNext
                  ? ""
                  : "disabled"
              }
              aria-label="Next episode"
            >
              Next
              <span>→</span>
            </button>

          </div>

        </div>

      </div>

    `;

  }


  /* =====================================================
     RENDER PLAYER
  ===================================================== */

  player.innerHTML =
    playerContent;


  /* =====================================================
     PREVIOUS EPISODE
  ===================================================== */

  const previousButton =
    document.getElementById(
      "previous-episode-btn"
    );


  if (
    previousButton &&
    hasPrevious
  ) {

    previousButton.addEventListener(
      "click",
      () => {

        selectEpisode(
          currentNumber - 1
        );

      }
    );

  }


  /* =====================================================
     NEXT EPISODE
  ===================================================== */

  const nextButton =
    document.getElementById(
      "next-episode-btn"
    );


  if (
    nextButton &&
    hasNext
  ) {

    nextButton.addEventListener(
      "click",
      () => {

        selectEpisode(
          currentNumber + 1
        );

      }
    );

  }


  /* =====================================================
     HIGHLIGHT SELECTED EPISODE
  ===================================================== */

  document
    .querySelectorAll(
      ".episode-card"
    )
    .forEach(
      card => {

        card.classList.remove(
          "episode-selected"
        );

      }
    );


  const selected =
    document.querySelector(
      `.episode-card[data-episode="${CSS.escape(
        String(
          episodeNumber
        )
      )}"]`
    );


  if (selected) {

    selected.classList.add(
      "episode-selected"
    );

  }


  /* =====================================================
     SCROLL TO PLAYER
  ===================================================== */

  if (watchSection) {

    watchSection.scrollIntoView({
      behavior:
        "smooth",

      block:
        "center"

    });

  }

}


/* =========================================================
   SAFE PLAYER TITLE
========================================================= */

function safeTitleForPlayer(
  title
) {

  return escapeHTML(
    String(
      title ||
      "Anime"
    )
  );

}


/* =========================================================
   LOAD EPISODES
========================================================= */

async function loadEpisodes(
  anime
) {

  const container =
    getEpisodeContainer();

  if (!container) {

    console.warn(
      "Episode container not found."
    );

    return;

  }


  currentEpisodes = [];

  currentEpisodePage = 1;


  let malId =
    anime?.malId || null;


  if (!malId && anime?.title) {

    try {

      const searchUrl =
        `${JIKAN_API}/anime?q=${encodeURIComponent(
          anime.title
        )}&limit=5&sfw=true`;


      const searchResponse =
        await fetchWithTimeout(
          searchUrl
        );


      if (
        searchResponse.ok
      ) {

        const searchJson =
          await searchResponse.json();


        const results =
          Array.isArray(
            searchJson?.data
          )
            ? searchJson.data
            : [];


        if (
          results.length > 0
        ) {

          const normalizeTitle =
            value =>
              String(
                value || ""
              )
                .toLowerCase()
                .replace(
                  /[^a-z0-9]/g,
                  ""
                );


          const targetTitle =
            normalizeTitle(
              anime.title
            );


          const exactMatch =
            results.find(
              item => {

                const titles = [

                  item.title,

                  item.title_english,

                  item.title_japanese,

                  ...(item.title_synonyms || [])

                ]
                  .filter(Boolean)
                  .map(
                    normalizeTitle
                  );


                return titles.some(
                  title =>
                    title ===
                    targetTitle
                );

              }
            );


          const closeMatch =
            results.find(
              item => {

                const titles = [

                  item.title,

                  item.title_english,

                  item.title_japanese,

                  ...(item.title_synonyms || [])

                ]
                  .filter(Boolean)
                  .map(
                    normalizeTitle
                  );


                return titles.some(
                  title =>
                    title.includes(
                      targetTitle
                    ) ||
                    targetTitle.includes(
                      title
                    )
                );

              }
            );


          const matchedAnime =
            exactMatch ||
            closeMatch ||
            results[0];


          malId =
            matchedAnime?.mal_id ||
            null;


          if (malId) {

            anime.malId =
              malId;

            window.__itsukiCurrentAnime =
              anime;

            console.log(
              "Resolved MAL ID:",
              malId,
              "for",
              anime.title
            );

          }

        }

      }

    } catch (error) {

      console.warn(
        "Jikan title search failed:",
        error.message
      );

    }

  }


  if (!malId) {

    container.innerHTML = `

      <div class="episodes-empty">

        <div class="episodes-empty-icon">
          📺
        </div>

        <h3>
          Episode list unavailable
        </h3>

        <p>
          Detailed episode information is currently unavailable for this anime source.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = `

    <div class="episodes-loading">

      <div class="details-loading-spinner"></div>

      <p>
        Loading episodes...
      </p>

    </div>

  `;


  try {

    const result =
      await getJikanEpisodes(
        malId,
        1
      );


    currentEpisodes =
      result.episodes;


    currentEpisodePage =
      result.nextPage ||
      1;


    window.__itsukiHasMoreEpisodes =
      result.hasNextPage;


    renderEpisodes(
      currentEpisodes
    );


  } catch (error) {

    console.warn(
      "Episodes failed:",
      error.message
    );


    let message =
      "Episode information could not be loaded.";


    if (
      error.message.includes(
        "busy"
      )
    ) {

      message =
        "The anime server is busy. Please try again in a few seconds.";

    }


    container.innerHTML = `

      <div class="episodes-empty">

        <div class="episodes-empty-icon">
          😕
        </div>

        <h3>
          Episodes unavailable
        </h3>

        <p>
          ${escapeHTML(
            message
          )}
        </p>

        <button
          id="retry-episodes-btn"
          class="episodes-retry"
          type="button"
        >
          🔄 Retry
        </button>

      </div>

    `;


    const retryButton =
      document.getElementById(
        "retry-episodes-btn"
      );


    if (
      retryButton
    ) {

      retryButton.addEventListener(
        "click",
        () =>
          loadEpisodes(
            anime
          )
      );

    }

  }

}


/* =========================================================
   LOAD MORE EPISODES
========================================================= */

async function loadMoreEpisodes() {

  if (
    !window.__itsukiHasMoreEpisodes
  ) {

    return;

  }


  const anime =
    window.__itsukiCurrentAnime;


  if (
    !anime?.malId
  ) {

    return;

  }


  const button =
    document.getElementById(
      "load-more-episodes"
    );


  if (!button) {

    return;

  }


  button.disabled =
    true;

  button.innerHTML =
    "⏳ Loading...";


  try {

    const result =
      await getJikanEpisodes(
        anime.malId,
        currentEpisodePage
      );


    currentEpisodes =
      currentEpisodes.concat(
        result.episodes
      );


    currentEpisodePage =
      result.nextPage ||
      currentEpisodePage;


    window.__itsukiHasMoreEpisodes =
      result.hasNextPage;


    renderEpisodes(
      currentEpisodes
    );

  } catch (error) {

    console.warn(
      "Load more episodes failed:",
      error.message
    );


    button.disabled =
      false;

    button.innerHTML =
      "🔄 Try Again";

  }

}


/* =========================================================
   EPISODE SECTION
========================================================= */

function createEpisodesSection() {

  return `

    <section
      id="episodes-section"
      class="episodes-section"
    >

      <div class="details-section-heading">

        <p class="section-tag">
          EPISODES
        </p>

        <h2>
          Episode <span>List</span>
        </h2>

      </div>


      <div
        id="episodes-container"
        class="episodes-container"
      >

        <div class="episodes-loading">

          <div class="details-loading-spinner"></div>

          <p>
            Loading episodes...
          </p>

        </div>

      </div>

    </section>

  `;

}


/* =========================================================
   LOADING SCREEN
========================================================= */

function showDetailsLoading(
  container
) {

  container.innerHTML = `

    <div class="details-loading">

      <div
        class="details-loading-spinner"
        aria-hidden="true"
      ></div>

      <p>
        Loading anime details...
      </p>

    </div>

  `;

}


/* =========================================================
   ERROR SCREEN
========================================================= */

function showDetailsError(
  container,
  error
) {

  let message =
    "Unable to load anime details. Please try again.";


  const errorMessage =
    String(
      error?.message ||
      ""
    );


  if (
    errorMessage.includes(
      "timed out"
    )
  ) {

    message =
      "The anime server is taking too long to respond.";

  }

  else if (
    errorMessage.includes(
      "busy"
    ) ||
    errorMessage.includes(
      "429"
    )
  ) {

    message =
      "The anime server is busy right now. Please wait a few seconds and try again.";

  }

  else if (
    errorMessage.includes(
      "not found"
    )
  ) {

    message =
      "This anime could not be found right now. Please try again later.";

  }


  container.innerHTML = `

    <div class="details-error">

      <div class="details-error-icon">
        😕
      </div>

      <h2>
        Something went wrong
      </h2>

      <p>
        ${escapeHTML(
          message
        )}
      </p>


      <div class="details-error-actions">

        <button
          id="retry-anime-btn"
          class="watch-btn"
          type="button"
        >
          🔄 Try Again
        </button>


        <a
          href="index.html"
          class="favorite-btn"
        >
          ← Back Home
        </a>

      </div>

    </div>

  `;


  const retryButton =
    document.getElementById(
      "retry-anime-btn"
    );


  if (
    retryButton
  ) {

    retryButton.addEventListener(
      "click",
      loadAnimeDetails
    );

  }

}


/* =========================================================
   RENDER DETAILS
========================================================= */

function renderAnimeDetails(
  container,
  anime
) {

  window.__itsukiCurrentAnime =
    anime;

  window.__itsukiHasMoreEpisodes =
    false;


  const favoriteAnime =
    createFavoriteAnime(
      anime
    );


  const favorite =
    isFavorite(
      anime.id
    );


  const favoriteText =
    favorite
      ? "❤️ Added to My List"
      : "🤍 Add to My List";


  const favoriteClass =
    favorite
      ? "favorited"
      : "";


  const safeTitle =
    escapeHTML(
      anime.title
    );


  const safeJapaneseTitle =
    escapeHTML(
      anime.titleJapanese
    );


  const safeImage =
    escapeHTML(
      anime.image
    );


  const safeBackground =
    escapeHTML(
      anime.background ||
      anime.image
    );


  const safeScore =
    escapeHTML(
      String(
        anime.score
      )
    );


  const safeEpisodes =
    escapeHTML(
      String(
        anime.episodes
      )
    );


  const safeYear =
    escapeHTML(
      String(
        anime.year
      )
    );


  const safeType =
    escapeHTML(
      String(
        anime.type
      )
    );


  const safeStatus =
    escapeHTML(
      String(
        anime.status
      )
    );


  const safeDuration =
    escapeHTML(
      String(
        anime.duration
      )
    );


  const safeSynopsis =
    escapeHTML(
      anime.synopsis
    );


  const safeSource =
    escapeHTML(
      anime.source
    );


  const studioHTML =
    createStudioHTML(
      anime.studios
    );


  const genreHTML =
    createGenreHTML(
      anime.genres
    );


  const themeHTML =
    createThemeHTML(
      anime.themes
    );


  container.innerHTML = `

    <section
      class="details-hero"
      ${
        safeBackground
          ? `style="--anime-bg: url('${safeBackground}')"`
          : ""
      }
    >

      <div class="details-hero-overlay"></div>


      <div class="details-hero-content">


        <div class="details-poster">

          ${
            safeImage
              ? `

                <img
                  src="${safeImage}"
                  alt="${safeTitle}"
                  loading="eager"
                  decoding="async"
                  onerror="this.style.display='none'"
                >

              `
              : `

                <div class="poster-placeholder">
                  No Image
                </div>

              `
          }

        </div>


        <div class="details-content">

          <p class="section-tag">
            ANIME DETAILS
          </p>


          <h1>
            ${safeTitle}
          </h1>


          ${
            safeJapaneseTitle
              ? `

                <p class="details-japanese-title">
                  ${safeJapaneseTitle}
                </p>

              `
              : ""
          }


          <div class="details-meta">

            <span>
              ⭐ ${safeScore}
            </span>

            <span>
              📺 ${safeEpisodes} Episodes
            </span>

            <span>
              📅 ${safeYear}
            </span>

            <span>
              🎬 ${safeType}
            </span>

          </div>


          <div class="details-status">

            <span
              class="status-dot"
              aria-hidden="true"
            ></span>

            ${safeStatus}

          </div>


          <div class="details-genres">

            ${genreHTML}

            ${themeHTML}

          </div>


          <p class="details-synopsis">
            ${safeSynopsis}
          </p>


          <div class="details-actions">

            ${
              anime.trailerUrl
                ? `

                  <button
                    id="trailer-btn"
                    class="watch-btn"
                    type="button"
                  >
                    ▶ Watch Trailer
                  </button>

                `
                : `

                  <button
                    class="info-btn"
                    type="button"
                    disabled
                  >
                    Trailer Not Available
                  </button>

                `
            }


            <button
              id="favorite-btn"
              class="favorite-btn ${favoriteClass}"
              type="button"
              aria-pressed="${
                favorite
                  ? "true"
                  : "false"
              }"
            >
              ${favoriteText}
            </button>

          </div>

        </div>

      </div>

    </section>


    <section class="details-info-section">

      <div class="details-section-heading">

        <p class="section-tag">
          INFORMATION
        </p>

        <h2>
          About <span>${safeTitle}</span>
        </h2>

      </div>


      <div class="details-info-grid">


        <div class="details-info-card">

          <div class="info-card-icon">
            ⭐
          </div>

          <div>
            <span>Rating</span>
            <strong>${safeScore}</strong>
          </div>

        </div>


        <div class="details-info-card">

          <div class="info-card-icon">
            🎬
          </div>

          <div>
            <span>Type</span>
            <strong>${safeType}</strong>
          </div>

        </div>


        <div class="details-info-card">

          <div class="info-card-icon">
            📺
          </div>

          <div>
            <span>Episodes</span>
            <strong>${safeEpisodes}</strong>
          </div>

        </div>


        <div class="details-info-card">

          <div class="info-card-icon">
            📅
          </div>

          <div>
            <span>Year</span>
            <strong>${safeYear}</strong>
          </div>

        </div>


        <div class="details-info-card">

          <div class="info-card-icon">
            📡
          </div>

          <div>
            <span>Status</span>
            <strong>${safeStatus}</strong>
          </div>

        </div>


        <div class="details-info-card">

          <div class="info-card-icon">
            ⏱️
          </div>

          <div>
            <span>Duration</span>
            <strong>${safeDuration}</strong>
          </div>

        </div>


        <div class="details-info-card">

          <div class="info-card-icon">
            🏢
          </div>

          <div>
            <span>Studio</span>
            <strong>${studioHTML}</strong>
          </div>

        </div>


        <div class="details-info-card">

          <div class="info-card-icon">
            🌐
          </div>

          <div>
            <span>Data Source</span>
            <strong>${safeSource}</strong>
          </div>

        </div>


      </div>

    </section>


    ${createEpisodesSection()}


    <section class="details-synopsis-section">

      <div class="details-section-heading">

        <p class="section-tag">
          STORY
        </p>

        <h2>
          Synopsis
        </h2>

      </div>


      <div class="synopsis-card">

        <p>
          ${safeSynopsis}
        </p>

      </div>

    </section>


    ${
      anime.trailerUrl
        ? `

          <section
            id="trailer-container"
            class="trailer-container"
          >

            <div class="trailer-header">

              <p class="section-tag">
                OFFICIAL TRAILER
              </p>

              <h2>
                Watch <span>Trailer</span>
              </h2>

            </div>


            <div class="trailer-frame">

              <iframe
                src="${escapeHTML(
                  anime.trailerUrl
                )}"
                title="${safeTitle} official trailer"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
              ></iframe>

            </div>

          </section>

        `
        : ""
    }


    <section
      id="watch-section"
      class="watch-section"
      hidden
    >

      <div class="watch-header">

        <div>

          <p class="section-tag">
            WATCH
          </p>

          <h2>
            Watch <span>Episode</span>
          </h2>

        </div>

      </div>


      <div
        id="anime-player"
        class="anime-player"
      >

        <div class="player-placeholder">

          <div class="player-icon">
            ▶
          </div>

          <p>
            Select an episode to begin.
          </p>

        </div>

      </div>

    </section>


    <section class="details-bottom-action">

      <a
        href="index.html"
        class="back-home-large"
      >
        ← Explore More Anime
      </a>

    </section>

  `;


  /* =====================================================
     FAVORITE BUTTON
  ===================================================== */

  const favoriteButton =
    document.getElementById(
      "favorite-btn"
    );


  if (
    favoriteButton
  ) {

    favoriteButton.addEventListener(
      "click",
      () => {

        toggleFavorite(
          favoriteAnime
        );

      }
    );

  }


  /* =====================================================
     TRAILER BUTTON
  ===================================================== */

  const trailerButton =
    document.getElementById(
      "trailer-btn"
    );


  if (
    trailerButton
  ) {

    trailerButton.addEventListener(
      "click",
      toggleTrailer
    );

  }


  /* =====================================================
     PAGE TITLE
  ===================================================== */

  document.title =
    `${anime.title} — ITSUKI ANIMES`;


  /* =====================================================
     LOAD EPISODES
  ===================================================== */

  loadEpisodes(
    anime
  );

}


/* =========================================================
   LOAD ANIME DETAILS
========================================================= */

async function loadAnimeDetails() {

  const container =
    document.getElementById(
      "anime-details"
    );


  if (!container) {

    console.error(
      "#anime-details not found"
    );

    return;

  }


  container.setAttribute(
    "aria-busy",
    "true"
  );


  if (!animeId) {

    container.innerHTML = `

      <div class="details-error">

        <div class="details-error-icon">
          ⚠️
        </div>

        <h2>
          Anime not found
        </h2>

        <p>
          No anime ID was provided.
        </p>

        <a
          href="index.html"
          class="watch-btn"
        >
          ← Back Home
        </a>

      </div>

    `;

    container.setAttribute(
      "aria-busy",
      "false"
    );

    return;

  }


  showDetailsLoading(
    container
  );


  try {

    console.log(
      "Loading anime:",
      animeId
    );


    const anime =
      await getAnimeData(
        animeId
      );


    if (!anime) {

      throw new Error(
        "Anime data unavailable."
      );

    }


    console.log(
      "Anime loaded successfully:",
      anime.title,
      anime.source
    );


    renderAnimeDetails(
      container,
      anime
    );


    container.setAttribute(
      "aria-busy",
      "false"
    );


    window.scrollTo({
      top: 0,
      behavior: "instant"
    });


  } catch (error) {

    console.error(
      "ANIME DETAILS ERROR:",
      error
    );


    showDetailsError(
      container,
      error
    );


    container.setAttribute(
      "aria-busy",
      "false"
    );

  }

}


/* =========================================================
   START APPLICATION
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    loadAnimeDetails
  );

} else {

  loadAnimeDetails();

}