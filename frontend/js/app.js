/* =========================================================================
   MYSTIPLAY — NAAGINI OTT
   app.js — global navigation, JSON loading, homepage, My List, Continue Watching

   ARCHITECTURE NOTE:
   data/episodes.json is the single source of truth for every season and
   episode. Nothing here ever hard-codes an episode title, duration, or
   video URL — everything is read dynamically from that file.
   ========================================================================= */

const MystiPlay = (() => {

  const DATA_URL = "/data/episodes.json";

  const STORAGE_KEYS = {
    MY_LIST: "mystiplay_my_list",
    CONTINUE_WATCHING: "mystiplay_continue_watching",
    PROFILE: "mystiplay_profile",
  };

  const EXPECTED_COUNTS = {
    "naagini-1": 62,
    "naagini-2": 72,
    "naagini-3": 205,
    "naagini-4": 30,
    "naagini-7": 50,
  };
  const EXPECTED_TOTAL = 419;

  let cachedData = null;
  let cachedPromise = null;

  // -----------------------------------------------------------------------
  // Data loading (cached)
  // -----------------------------------------------------------------------

  async function loadData() {
    if (cachedData) return cachedData;
    if (cachedPromise) return cachedPromise;

    cachedPromise = fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((json) => {
        cachedData = json;
        validateEpisodeCounts(json);
        return json;
      })
      .catch((err) => {
        console.error("MystiPlay: failed to load episodes.json", err);
        showGlobalDataError();
        throw err;
      });

    return cachedPromise;
  }

  function validateEpisodeCounts(json) {
    const seasons = json.seasons || [];
    let total = 0;
    let ok = true;

    seasons.forEach((s) => {
      const expected = EXPECTED_COUNTS[s.id];
      const actual = s.episodes ? s.episodes.length : 0;
      total += actual;
      if (expected !== undefined && expected !== actual) {
        ok = false;
        console.error(
          `[MystiPlay validation] ${s.id}: expected ${expected} episodes, found ${actual}`
        );
      }
    });

    if (total !== EXPECTED_TOTAL) {
      ok = false;
      console.error(
        `[MystiPlay validation] Expected total of ${EXPECTED_TOTAL} episodes, found ${total}`
      );
    }

    const forbidden = ["naagini-5", "naagini-6", "naagini-8", "Naagini 5", "Naagini 6", "Naagini 8"];
    const raw = JSON.stringify(json);
    forbidden.forEach((term) => {
      if (raw.includes(term)) {
        ok = false;
        console.error(`[MystiPlay validation] Forbidden season reference found: "${term}"`);
      }
    });

    if (ok) {
      console.log(`[MystiPlay validation] OK — ${seasons.length} seasons, ${total} episodes total.`);
    }
    return ok;
  }

  function showGlobalDataError() {
    const banner = document.querySelector("[data-global-error]");
    if (banner) {
      banner.textContent = "Unable to load MystiPlay content. Please check data/episodes.json.";
      banner.classList.add("show");
    }
  }

  function getSeason(json, seasonId) {
    return (json.seasons || []).find((s) => s.id === seasonId) || null;
  }

  function getEpisode(season, episodeNumber) {
    if (!season) return null;
    return (season.episodes || []).find((e) => e.episode === Number(episodeNumber)) || null;
  }

  // -----------------------------------------------------------------------
  // Robust LocalStorage helpers
  // -----------------------------------------------------------------------

  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
      console.warn(`MystiPlay: corrupted localStorage key "${key}", resetting.`, err);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`MystiPlay: could not write localStorage key "${key}"`, err);
      return false;
    }
  }

  // ---- My List ------------------------------------------------------------

  function getMyList() {
    const list = safeGet(STORAGE_KEYS.MY_LIST, []);
    return Array.isArray(list) ? list : [];
  }

  function isInMyList(seasonId, episodeNumber) {
    return getMyList().some(
      (item) => item.seasonId === seasonId && item.episode === Number(episodeNumber)
    );
  }

  function addToMyList(seasonId, episodeNumber, meta = {}) {
    const list = getMyList();
    if (isInMyList(seasonId, episodeNumber)) return list;
    list.unshift({
      seasonId,
      episode: Number(episodeNumber),
      addedAt: Date.now(),
      ...meta,
    });
    safeSet(STORAGE_KEYS.MY_LIST, list);
    return list;
  }

  function removeFromMyList(seasonId, episodeNumber) {
    const list = getMyList().filter(
      (item) => !(item.seasonId === seasonId && item.episode === Number(episodeNumber))
    );
    safeSet(STORAGE_KEYS.MY_LIST, list);
    return list;
  }

  function toggleMyList(seasonId, episodeNumber, meta = {}) {
    if (isInMyList(seasonId, episodeNumber)) {
      removeFromMyList(seasonId, episodeNumber);
      return false;
    }
    addToMyList(seasonId, episodeNumber, meta);
    return true;
  }

  // ---- Continue Watching ---------------------------------------------------

  function getContinueWatching() {
    const list = safeGet(STORAGE_KEYS.CONTINUE_WATCHING, []);
    return Array.isArray(list) ? list : [];
  }

  function updateProgress(seasonId, episodeNumber, currentTime, duration) {
    if (!duration || duration <= 0) return;
    const percent = Math.min(100, Math.round((currentTime / duration) * 100));
    let list = getContinueWatching();

    // Remove near-complete entries (>= 92% watched)
    list = list.filter(
      (item) => !(item.seasonId === seasonId && item.episode === Number(episodeNumber))
    );

    if (percent < 92) {
      list.unshift({
        seasonId,
        episode: Number(episodeNumber),
        currentTime,
        duration,
        percent,
        lastWatched: Date.now(),
      });
    }

    // Keep list to a reasonable size
    list = list.slice(0, 20);
    safeSet(STORAGE_KEYS.CONTINUE_WATCHING, list);
  }

  function getResumeTime(seasonId, episodeNumber) {
    const entry = getContinueWatching().find(
      (item) => item.seasonId === seasonId && item.episode === Number(episodeNumber)
    );
    return entry ? entry.currentTime : 0;
  }

  // ---- Profile --------------------------------------------------------------

  function getProfile() {
    return safeGet(STORAGE_KEYS.PROFILE, { name: "Varun" });
  }

  function setProfileName(name) {
    safeSet(STORAGE_KEYS.PROFILE, { name });
  }

  // -----------------------------------------------------------------------
  // Rendering helpers
  // -----------------------------------------------------------------------

  function placeholderArt(label = "CINEMATIC ART") {
    return `
      <div class="art-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h2l1.5-2h7L17 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><circle cx="12" cy="13" r="3.5"/></svg>
        <div class="pl-title">MYSTIPLAY</div>
        <div class="pl-sub">${escapeHtml(label)}</div>
      </div>`;
  }

  function imgOrPlaceholder(src, alt, label) {
    // We can't synchronously know if the image 404s, so we attach an
    // onerror handler that swaps the whole media node for a placeholder.
    const safeAlt = escapeHtml(alt || "");
    return `<img src="${src}" alt="${safeAlt}" loading="lazy"
              onerror="MystiPlay.handleImgError(this, '${escapeAttr(label || 'CINEMATIC ART')}')">`;
  }

  function handleImgError(imgEl, label) {
    const parent = imgEl.parentElement;
    if (!parent || parent.dataset.fallbackApplied) return;
    parent.dataset.fallbackApplied = "true";
    imgEl.remove();
    parent.insertAdjacentHTML("afterbegin", placeholderArt(label));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  function seasonCardHtml(season) {
    return `
      <a class="season-card slide-up" href="/season.html?season=${season.id}" aria-label="Open ${escapeHtml(season.title)}">
        <div class="season-card-media">
          ${imgOrPlaceholder(season.poster, season.title, season.title)}
          <div class="season-card-overlay-play">
            <span class="play-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </span>
          </div>
          <div class="season-card-body">
            <h3 class="season-card-title">${escapeHtml(season.title)}</h3>
            <div class="season-card-count">${season.episode_count} Episodes</div>
          </div>
        </div>
      </a>`;
  }

  function episodeCardHtml(season, ep, opts = {}) {
    const watched = getResumeTime(season.id, ep.episode);
    const cwEntry = getContinueWatching().find(
      (i) => i.seasonId === season.id && i.episode === ep.episode
    );
    const progressHtml = cwEntry
      ? `<div class="ep-progress-track"><div class="ep-progress-fill" style="width:${cwEntry.percent}%"></div></div>`
      : "";

    return `
      <a class="episode-card fade-in" href="/player.html?season=${season.id}&episode=${ep.episode}"
         aria-label="Play ${escapeHtml(season.title)} ${escapeHtml(ep.title)}">
        <div class="episode-thumb">
          ${imgOrPlaceholder(ep.thumbnail, ep.title, `EP ${ep.episode}`)}
          <span class="ep-badge">EP ${ep.episode}</span>
          <span class="ep-duration">${escapeHtml(ep.duration)}</span>
          <div class="ep-play-overlay">
            <span class="play-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </span>
          </div>
          ${progressHtml}
        </div>
        <div class="episode-info">
          <p class="episode-title">${escapeHtml(ep.title)}${opts.showSeasonTitle ? ` &middot; ${escapeHtml(season.title)}` : ""}</p>
          <div class="episode-play-row">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Play
          </div>
        </div>
      </a>`;
  }

  // -----------------------------------------------------------------------
  // Shared nav / chrome behaviour
  // -----------------------------------------------------------------------

  function initChrome() {
    const nav = document.querySelector(".nav");
    if (nav) {
      window.addEventListener("scroll", () => {
        nav.classList.toggle("is-scrolled", window.scrollY > 8);
      }, { passive: true });
    }

    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", () => {
        const isOpen = links.style.display === "flex";
        links.style.display = isOpen ? "none" : "flex";
        toggle.setAttribute("aria-expanded", String(!isOpen));
      });
    }

    // Profile modal
    const profileTriggers = document.querySelectorAll("[data-open-profile]");
    const profileModal = document.querySelector(".profile-modal");
    if (profileModal) {
      profileTriggers.forEach((btn) =>
        btn.addEventListener("click", () => {
          renderProfileModal();
          profileModal.classList.add("open");
        })
      );
      profileModal.addEventListener("click", (e) => {
        if (e.target === profileModal || e.target.closest("[data-close-profile]")) {
          profileModal.classList.remove("open");
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") profileModal.classList.remove("open");
      });
    }

    highlightActiveNav();
  }

  function highlightActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll(".nav-links a, .bottom-nav-list a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href === path || (path === "/" && href === "/index.html")) {
        a.classList.add("active");
      }
    });
  }

  function renderProfileModal() {
    const nameEl = document.querySelector("[data-profile-name]");
    const avatarEl = document.querySelector("[data-profile-avatar]");
    const profile = getProfile();
    if (nameEl) nameEl.textContent = profile.name;
    if (avatarEl) avatarEl.textContent = (profile.name || "V").charAt(0).toUpperCase();
  }

  // -----------------------------------------------------------------------
  // Homepage
  // -----------------------------------------------------------------------

  async function initHomepage() {
    initChrome();
    try {
      const data = await loadData();
      renderHero(data);
      renderContinueWatching(data);
      renderLatest(data);
      renderPopular(data);
      renderShows(data);
    } catch (err) {
      // error banner already shown by loadData()
    }
  }

  function renderHero(data) {
    const featured = data.seasons[data.seasons.length - 1]; // most recent-feeling season
    const heroMedia = document.querySelector("[data-hero-media]");
    const heroTitle = document.querySelector("[data-hero-title]");
    const heroDesc = document.querySelector("[data-hero-desc]");
    const heroCount = document.querySelector("[data-hero-count]");
    const watchBtn = document.querySelector("[data-hero-watch]");
    const listBtn = document.querySelector("[data-hero-list]");

    if (!featured) return;

    if (heroMedia) {
      const img = new Image();
      img.onload = () => {
        heroMedia.style.backgroundImage = `url('${featured.banner}')`;
        heroMedia.querySelector(".hero-placeholder")?.remove();
      };
      img.onerror = () => {
        /* keep placeholder */
      };
      img.src = "/" + featured.banner;
    }

    if (heroTitle) heroTitle.textContent = featured.title;
    if (heroDesc) heroDesc.textContent = featured.description;
    if (heroCount) heroCount.textContent = `${featured.episode_count} Episodes`;
    if (watchBtn) watchBtn.href = `/player.html?season=${featured.id}&episode=1`;
    if (listBtn) {
      listBtn.href = `/season.html?season=${featured.id}`;
    }
  }

  function renderContinueWatching(data) {
    const section = document.querySelector("[data-cw-section]");
    const rail = document.querySelector("[data-cw-rail]");
    if (!rail || !section) return;

    const items = getContinueWatching();
    if (!items.length) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";

    rail.innerHTML = items
      .map((item) => {
        const season = getSeason(data, item.seasonId);
        if (!season) return "";
        const ep = getEpisode(season, item.episode);
        if (!ep) return "";
        return `
          <a class="season-card cw-card slide-up" href="/player.html?season=${season.id}&episode=${ep.episode}">
            <div class="season-card-media">
              ${imgOrPlaceholder(ep.thumbnail, ep.title, season.title)}
              <span class="cw-percent">${item.percent}% watched</span>
              <div class="season-card-overlay-play">
                <span class="play-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </span>
              </div>
              <div class="season-card-body">
                <h3 class="season-card-title">${escapeHtml(season.title)}</h3>
                <div class="season-card-count">${escapeHtml(ep.title)}</div>
              </div>
              <div class="ep-progress-track"><div class="ep-progress-fill" style="width:${item.percent}%"></div></div>
            </div>
          </a>`;
      })
      .join("");
  }

  function allEpisodesFlat(data) {
    const flat = [];
    data.seasons.forEach((season) => {
      season.episodes.forEach((ep) => flat.push({ season, ep }));
    });
    return flat;
  }

  function renderLatest(data) {
    const rail = document.querySelector("[data-latest-rail]");
    if (!rail) return;
    const flat = allEpisodesFlat(data);
    // "Latest" = highest episode numbers across the most advanced seasons,
    // derived purely from the dataset (no hard-coded list).
    const latest = flat
      .slice()
      .sort((a, b) => b.ep.episode - a.ep.episode || (a.season.id > b.season.id ? -1 : 1))
      .slice(0, 16);
    rail.innerHTML = latest.map(({ season, ep }) => episodeCardHtml(season, ep, { showSeasonTitle: true })).join("");
  }

  function renderPopular(data) {
    const rail = document.querySelector("[data-popular-rail]");
    if (!rail) return;
    const flat = allEpisodesFlat(data);
    const popular = flat
      .slice()
      .sort((a, b) => (b.ep.popularity || 0) - (a.ep.popularity || 0))
      .slice(0, 16);
    rail.innerHTML = popular.map(({ season, ep }) => episodeCardHtml(season, ep, { showSeasonTitle: true })).join("");
  }

  function renderShows(data) {
    const grid = document.querySelector("[data-shows-grid]");
    if (!grid) return;
    grid.innerHTML = data.seasons.map(seasonCardHtml).join("");
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  return {
    STORAGE_KEYS,
    loadData,
    getSeason,
    getEpisode,
    getMyList,
    isInMyList,
    addToMyList,
    removeFromMyList,
    toggleMyList,
    getContinueWatching,
    updateProgress,
    getResumeTime,
    getProfile,
    setProfileName,
    placeholderArt,
    imgOrPlaceholder,
    handleImgError,
    escapeHtml,
    seasonCardHtml,
    episodeCardHtml,
    initChrome,
    highlightActiveNav,
    initHomepage,
    allEpisodesFlat,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "home") {
    MystiPlay.initHomepage();
  }
});
