/* =========================================================================
   MYSTIPLAY — NAAGINI OTT
   seasons.js — season cover page, episode grid, load-more pagination
   ========================================================================= */

(() => {
  const PAGE_SIZE = 24;
  let state = {
    season: null,
    rendered: 0,
  };

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  async function init() {
    MystiPlay.initChrome();

    const seasonId = getParam("season");
    if (!seasonId) {
      showError("No season specified.");
      return;
    }

    try {
      const data = await MystiPlay.loadData();
      const season = MystiPlay.getSeason(data, seasonId);
      if (!season) {
        showError("That season could not be found.");
        return;
      }
      state.season = season;
      renderCover(season);
      renderEpisodesFirstPage(season);
      wireActions(season);
    } catch (err) {
      // global error banner already shown
    }
  }

  function showError(message) {
    const banner = document.querySelector("[data-global-error]");
    if (banner) {
      banner.textContent = message;
      banner.classList.add("show");
    }
  }

  function renderCover(season) {
    document.title = `${season.title} — MystiPlay`;

    const mediaEl = document.querySelector("[data-cover-media]");
    const posterEl = document.querySelector("[data-cover-poster]");
    const titleEl = document.querySelector("[data-cover-title]");
    const descEl = document.querySelector("[data-cover-desc]");
    const countEl = document.querySelector("[data-cover-count]");
    const castEl = document.querySelector("[data-cover-cast]");
    const watchBtn = document.querySelector("[data-cover-watch]");
    const listBtn = document.querySelector("[data-cover-list]");

    if (mediaEl) {
      const img = new Image();
      img.onload = () => {
        mediaEl.style.backgroundImage = `url('${season.banner}')`;
        mediaEl.querySelector(".hero-placeholder")?.remove();
      };
      img.src = "/" + season.banner;
    }

    if (posterEl) {
      posterEl.innerHTML = MystiPlay.imgOrPlaceholder(season.poster, season.title, season.title);
    }
    if (titleEl) titleEl.textContent = season.title;
    if (descEl) descEl.textContent = season.description;
    if (countEl) countEl.textContent = `${season.episode_count} Episodes`;
    if (castEl) {
      castEl.innerHTML = (season.cast || [])
        .map((name) => `<span class="cast-chip">${MystiPlay.escapeHtml(name)}</span>`)
        .join("");
    }
    if (watchBtn) watchBtn.href = `/player.html?season=${season.id}&episode=1`;

    updateListButton(listBtn, season);
    if (listBtn) {
      listBtn.addEventListener("click", () => {
        const firstEp = season.episodes[0];
        MystiPlay.toggleMyList(season.id, firstEp.episode, {
          title: season.title,
          thumbnail: firstEp.thumbnail,
        });
        updateListButton(listBtn, season);
      });
    }
  }

  function updateListButton(btn, season) {
    if (!btn) return;
    const firstEp = season.episodes[0];
    const saved = MystiPlay.isInMyList(season.id, firstEp.episode);
    btn.textContent = saved ? "✓ In My List" : "+ Add to My List";
  }

  function renderEpisodesFirstPage(season) {
    const grid = document.querySelector("[data-episode-grid]");
    const rangeLabel = document.querySelector("[data-range-label]");
    const loadMoreBtn = document.querySelector("[data-load-more]");
    if (!grid) return;

    grid.innerHTML = "";
    state.rendered = 0;

    renderNextPage(season, grid, rangeLabel, loadMoreBtn);

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        renderNextPage(season, grid, rangeLabel, loadMoreBtn);
      });
    }
  }

  function renderNextPage(season, grid, rangeLabel, loadMoreBtn) {
    const episodes = season.episodes;
    const start = state.rendered;
    const end = Math.min(start + PAGE_SIZE, episodes.length);
    const slice = episodes.slice(start, end);

    const html = slice.map((ep) => MystiPlay.episodeCardHtml(season, ep)).join("");
    grid.insertAdjacentHTML("beforeend", html);

    state.rendered = end;

    if (rangeLabel) {
      rangeLabel.textContent = `Episodes 1–${state.rendered} of ${episodes.length}`;
    }

    if (loadMoreBtn) {
      loadMoreBtn.style.display = state.rendered >= episodes.length ? "none" : "";
    }
  }

  function wireActions(season) {
    const scrollBtn = document.querySelector("[data-scroll-episodes]");
    if (scrollBtn) {
      scrollBtn.addEventListener("click", () => {
        document.querySelector("[data-episode-grid]")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
