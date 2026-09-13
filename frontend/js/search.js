/* =========================================================================
   MYSTIPLAY — NAAGINI OTT
   search.js — live search input, filtering, results rendering
   ========================================================================= */

(() => {
  let dataCache = null;
  let debounceTimer = null;

  async function init() {
    MystiPlay.initChrome();

    const input = document.querySelector("[data-search-input]");
    const results = document.querySelector("[data-search-results]");
    if (!input || !results) return;

    try {
      dataCache = await MystiPlay.loadData();
    } catch (err) {
      return;
    }

    // Support ?q= prefill from nav search shortcuts
    const prefill = new URLSearchParams(window.location.search).get("q");
    if (prefill) {
      input.value = prefill;
      runSearch(prefill, results);
    } else {
      renderEmpty(results, "Start typing to search seasons, episodes, and cast.");
    }

    input.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      debounceTimer = setTimeout(() => runSearch(query, results), 150);
    });

    input.focus();
  }

  function runSearch(query, resultsEl) {
    if (!query) {
      renderEmpty(resultsEl, "Start typing to search seasons, episodes, and cast.");
      return;
    }

    const q = query.toLowerCase();
    const matchedSeasons = [];
    const matchedEpisodes = [];

    dataCache.seasons.forEach((season) => {
      const seasonMatches =
        season.title.toLowerCase().includes(q) ||
        (season.cast || []).some((c) => c.toLowerCase().includes(q));

      if (seasonMatches) matchedSeasons.push(season);

      season.episodes.forEach((ep) => {
        const epNumStr = String(ep.episode);
        const epMatches =
          ep.title.toLowerCase().includes(q) ||
          epNumStr === q.replace(/\D/g, "") && q.replace(/\D/g, "") !== "" ||
          `episode ${epNumStr}`.includes(q);

        if (epMatches && matchedEpisodes.length < 60) {
          matchedEpisodes.push({ season, ep });
        }
      });
    });

    if (!matchedSeasons.length && !matchedEpisodes.length) {
      renderEmpty(resultsEl, `No results for "${MystiPlay.escapeHtml(query)}".`);
      return;
    }

    let html = "";

    if (matchedSeasons.length) {
      html += `
        <div class="search-group">
          <h2 class="search-group-title">Seasons</h2>
          ${matchedSeasons.map(seasonRowHtml).join("")}
        </div>`;
    }

    if (matchedEpisodes.length) {
      html += `
        <div class="search-group">
          <h2 class="search-group-title">Episodes</h2>
          ${matchedEpisodes.map(({ season, ep }) => episodeRowHtml(season, ep)).join("")}
        </div>`;
    }

    resultsEl.innerHTML = html;
  }

  function seasonRowHtml(season) {
    return `
      <a class="search-row" href="/season.html?season=${season.id}">
        <div class="search-row-thumb">${MystiPlay.imgOrPlaceholder(season.poster, season.title, season.title)}</div>
        <div class="search-row-info">
          <p class="search-row-title">${MystiPlay.escapeHtml(season.title)}</p>
          <p class="search-row-sub">${season.episode_count} Episodes</p>
        </div>
      </a>`;
  }

  function episodeRowHtml(season, ep) {
    return `
      <a class="search-row" href="/player.html?season=${season.id}&episode=${ep.episode}">
        <div class="search-row-thumb">${MystiPlay.imgOrPlaceholder(ep.thumbnail, ep.title, `EP ${ep.episode}`)}</div>
        <div class="search-row-info">
          <p class="search-row-title">${MystiPlay.escapeHtml(season.title)} &middot; ${MystiPlay.escapeHtml(ep.title)}</p>
          <p class="search-row-sub">${MystiPlay.escapeHtml(ep.duration)}</p>
        </div>
      </a>`;
  }

  function renderEmpty(resultsEl, message) {
    resultsEl.innerHTML = `<div class="search-empty">${MystiPlay.escapeHtml(message)}</div>`;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
