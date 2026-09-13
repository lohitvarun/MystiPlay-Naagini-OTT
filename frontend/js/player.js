/* =========================================================================
   MYSTIPLAY — NAAGINI OTT
   player.js — HTML5 video player, playback controls, resume,
   next/previous episode, auto-play next, skip intro.

   The skip-intro duration is intentionally easy to change:
   ========================================================================= */

const INTRO_SKIP_SECONDS = 30;

(() => {
  let dataCache = null;
  let currentSeason = null;
  let currentEpisode = null;
  let progressSaveTimer = null;
  let hasResumed = false;

  const els = {};

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setParams(seasonId, episodeNumber) {
    const url = new URL(window.location.href);
    url.searchParams.set("season", seasonId);
    url.searchParams.set("episode", episodeNumber);
    window.history.replaceState({}, "", url);
  }

  async function init() {
    MystiPlay.initChrome();
    cacheEls();
    wireControls();

    const seasonId = getParam("season");
    const episodeNum = getParam("episode");

    if (!seasonId || !episodeNum) {
      showError("No episode specified.");
      return;
    }

    try {
      dataCache = await MystiPlay.loadData();
      loadEpisode(seasonId, episodeNum);
    } catch (err) {
      showError("Unable to load MystiPlay content. Please check data/episodes.json.");
    }
  }

  function cacheEls() {
    els.video = document.querySelector("[data-video]");
    els.loading = document.querySelector("[data-player-loading]");
    els.error = document.querySelector("[data-player-error]");
    els.errorDetail = document.querySelector("[data-error-detail]");
    els.skipIntro = document.querySelector("[data-skip-intro]");
    els.backLink = document.querySelector("[data-back-link]");
    els.seasonLabel = document.querySelector("[data-player-season-label]");
    els.episodeTitle = document.querySelector("[data-player-episode-title]");
    els.episodeDesc = document.querySelector("[data-player-episode-desc]");
    els.prevBtn = document.querySelector("[data-prev-episode]");
    els.nextBtn = document.querySelector("[data-next-episode]");
    els.playPauseBtn = document.querySelector("[data-play-pause]");
    els.playIcon = document.querySelector("[data-play-icon]");
    els.pauseIcon = document.querySelector("[data-pause-icon]");
    els.progressBar = document.querySelector("[data-progress-bar]");
    els.progressFill = document.querySelector("[data-progress-fill]");
    els.progressBuffer = document.querySelector("[data-progress-buffer]");
    els.timeLabel = document.querySelector("[data-time-label]");
    els.volumeSlider = document.querySelector("[data-volume]");
    els.muteBtn = document.querySelector("[data-mute]");
    els.speedSelect = document.querySelector("[data-speed]");
    els.fullscreenBtn = document.querySelector("[data-fullscreen]");
    els.endOfSeason = document.querySelector("[data-end-of-season]");
    els.myListBtn = document.querySelector("[data-player-mylist]");
  }

  function loadEpisode(seasonId, episodeNum) {
    const season = MystiPlay.getSeason(dataCache, seasonId);
    if (!season) {
      showError(`Season "${seasonId}" was not found in episodes.json.`);
      return;
    }
    const episode = MystiPlay.getEpisode(season, episodeNum);
    if (!episode) {
      showError(`Episode ${episodeNum} was not found for ${season.title}.`);
      return;
    }

    currentSeason = season;
    currentEpisode = episode;
    hasResumed = false;
    setParams(season.id, episode.episode);

    document.title = `${season.title} · ${episode.title} — MystiPlay`;

    if (els.seasonLabel) els.seasonLabel.textContent = season.title;
    if (els.episodeTitle) els.episodeTitle.textContent = episode.title;
    if (els.episodeDesc) {
      els.episodeDesc.textContent = `Duration ${episode.duration} · ${season.description}`;
    }
    if (els.backLink) els.backLink.href = `/season.html?season=${season.id}`;
    if (els.endOfSeason) els.endOfSeason.classList.remove("show");
    if (els.skipIntro) els.skipIntro.classList.remove("hidden");

    updatePrevNextButtons();
    updateMyListButton();
    playVideo(episode.video_url);
  }

function convertGoogleDriveUrl(url) {
  if (!url) return "";

  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
}

function playVideo(url) {
  const video = els.video;
  if (!video) return;

  showLoading(true);
  showError(null);

  video.src = convertGoogleDriveUrl(url);
  video.load();

  video.play().catch(() => {
    // Autoplay might be blocked; that's fine, user can press play.
  });
}

  function showLoading(isLoading) {
    if (!els.loading) return;
    els.loading.classList.toggle("hidden", !isLoading);
  }

  function showError(message) {
    if (!els.error) return;
    if (!message) {
      els.error.classList.add("hidden");
      return;
    }
    showLoading(false);
    if (els.errorDetail) els.errorDetail.textContent = message;
    els.error.classList.remove("hidden");
  }

  function updatePrevNextButtons() {
    const episodes = currentSeason.episodes;
    const idx = episodes.findIndex((e) => e.episode === currentEpisode.episode);
    const prev = idx > 0 ? episodes[idx - 1] : null;
    const next = idx < episodes.length - 1 ? episodes[idx + 1] : null;

    if (els.prevBtn) {
      els.prevBtn.disabled = !prev;
      els.prevBtn.onclick = prev
        ? () => loadEpisode(currentSeason.id, prev.episode)
        : null;
    }
    if (els.nextBtn) {
      els.nextBtn.disabled = !next;
      els.nextBtn.onclick = next
        ? () => loadEpisode(currentSeason.id, next.episode)
        : null;
    }
  }

  function updateMyListButton() {
    if (!els.myListBtn) return;
    const saved = MystiPlay.isInMyList(currentSeason.id, currentEpisode.episode);
    els.myListBtn.textContent = saved ? "✓ In My List" : "+ My List";
  }

  function goToNextEpisode({ autoplay } = { autoplay: false }) {
    const episodes = currentSeason.episodes;
    const idx = episodes.findIndex((e) => e.episode === currentEpisode.episode);
    const next = idx < episodes.length - 1 ? episodes[idx + 1] : null;

    if (next) {
      loadEpisode(currentSeason.id, next.episode);
    } else if (els.endOfSeason) {
      els.endOfSeason.textContent = "You've reached the end of this season.";
      els.endOfSeason.classList.add("show");
    }
  }

  // -----------------------------------------------------------------------
  // Controls
  // -----------------------------------------------------------------------

  function wireControls() {
    const video = els.video;
    if (!video) return;

    video.addEventListener("loadedmetadata", () => {
      showLoading(false);
      if (!hasResumed && currentSeason && currentEpisode) {
        const resumeTime = MystiPlay.getResumeTime(currentSeason.id, currentEpisode.episode);
        if (resumeTime && resumeTime < video.duration - 5) {
          video.currentTime = resumeTime;
        }
        hasResumed = true;
      }
      updateTimeLabel();
    });

    video.addEventListener("waiting", () => showLoading(true));
    video.addEventListener("playing", () => showLoading(false));
    video.addEventListener("canplay", () => showLoading(false));

    video.addEventListener("error", () => {
      showError("Unable to play this video. Please check the video URL in data/episodes.json.");
    });

    video.addEventListener("timeupdate", () => {
      updateProgressBar();
      updateTimeLabel();
      maybeSaveProgress();
      maybeHideSkipIntro();
    });

    video.addEventListener("progress", updateBufferBar);

    video.addEventListener("play", () => togglePlayIcon(true));
    video.addEventListener("pause", () => togglePlayIcon(false));

    video.addEventListener("ended", () => {
      saveProgress(true);
      goToNextEpisode({ autoplay: true });
    });

    if (els.playPauseBtn) {
      els.playPauseBtn.addEventListener("click", () => {
        if (video.paused) video.play();
        else video.pause();
      });
    }

    if (els.progressBar) {
      els.progressBar.addEventListener("click", (e) => {
        const rect = els.progressBar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        if (video.duration) video.currentTime = ratio * video.duration;
      });
    }

    if (els.volumeSlider) {
      els.volumeSlider.addEventListener("input", (e) => {
        video.volume = Number(e.target.value);
        video.muted = video.volume === 0;
      });
    }

    if (els.muteBtn) {
      els.muteBtn.addEventListener("click", () => {
        video.muted = !video.muted;
      });
    }

    if (els.speedSelect) {
      els.speedSelect.addEventListener("change", (e) => {
        video.playbackRate = Number(e.target.value);
      });
    }

    if (els.fullscreenBtn) {
      els.fullscreenBtn.addEventListener("click", () => {
        const wrap = document.querySelector(".video-wrap");
        if (!document.fullscreenElement) {
          wrap?.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      });
    }

    if (els.skipIntro) {
      els.skipIntro.addEventListener("click", () => {
        video.currentTime = Math.min(video.currentTime + INTRO_SKIP_SECONDS, video.duration || Infinity);
        els.skipIntro.classList.add("hidden");
      });
    }

    if (els.myListBtn) {
      els.myListBtn.addEventListener("click", () => {
        MystiPlay.toggleMyList(currentSeason.id, currentEpisode.episode, {
          title: `${currentSeason.title} · ${currentEpisode.title}`,
          thumbnail: currentEpisode.thumbnail,
        });
        updateMyListButton();
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); video.paused ? video.play() : video.pause(); }
      if (e.code === "ArrowRight") video.currentTime += 10;
      if (e.code === "ArrowLeft") video.currentTime -= 10;
    });
  }

  function togglePlayIcon(isPlaying) {
    els.playIcon?.classList.toggle("hidden", isPlaying);
    els.pauseIcon?.classList.toggle("hidden", !isPlaying);
  }

  function updateProgressBar() {
    const video = els.video;
    if (!video || !video.duration || !els.progressFill) return;
    const pct = (video.currentTime / video.duration) * 100;
    els.progressFill.style.width = `${pct}%`;
  }

  function updateBufferBar() {
    const video = els.video;
    if (!video || !video.duration || !els.progressBuffer || !video.buffered.length) return;
    const end = video.buffered.end(video.buffered.length - 1);
    els.progressBuffer.style.width = `${(end / video.duration) * 100}%`;
  }

  function updateTimeLabel() {
    const video = els.video;
    if (!video || !els.timeLabel) return;
    els.timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function maybeSaveProgress() {
    clearTimeout(progressSaveTimer);
    progressSaveTimer = setTimeout(() => saveProgress(false), 1500);
  }

  function saveProgress(completed) {
    const video = els.video;
    if (!video || !currentSeason || !currentEpisode || !video.duration) return;
    const time = completed ? video.duration : video.currentTime;
    MystiPlay.updateProgress(currentSeason.id, currentEpisode.episode, time, video.duration);
  }

  function maybeHideSkipIntro() {
    const video = els.video;
    if (!els.skipIntro || !video) return;
    if (video.currentTime > INTRO_SKIP_SECONDS + 15) {
      els.skipIntro.classList.add("hidden");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
