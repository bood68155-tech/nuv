/*
 * NUV — section behaviours.
 * Everything the section set needs that is not the portfolio grid itself:
 * the navigation drawer, the scrolling marquees, the client-wins rotator,
 * the success-story rail, the testimonial slider and the FAQ accordion.
 * Reads the same store as the rest of the site; renders nothing that the
 * admin panel cannot drive.
 */
(function () {
  "use strict";

  var store = window.NUVStore;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = {};

  var winsTimer = null;
  var winsIndex = 0;
  var winsCount = 0;

  var quotes = [];
  var quoteIndex = 0;

  /* ---------- Helpers ---------- */

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(value, allowImageData) {
    var raw = String(value == null ? "" : value).trim();
    if (!raw) return "";
    var probe = raw.replace(/[\u0000-\u0020\u007f]+/g, "").toLowerCase();
    if (probe.indexOf("javascript:") === 0 || probe.indexOf("vbscript:") === 0) return "";
    if (probe.indexOf("data:") === 0) {
      return allowImageData && /^data:image\//i.test(raw) ? raw : "";
    }
    return raw;
  }

  function initials(value) {
    var words = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "N";
    return words.slice(0, 2).map(function (word) { return word.charAt(0); }).join("").toUpperCase();
  }

  function settings() {
    try {
      return store.getSettings();
    } catch (error) {
      return {};
    }
  }

  function projects() {
    try {
      return store.getProjects();
    } catch (error) {
      return [];
    }
  }

  /* ---------- Navigation drawer ---------- */

  function drawerIsOpen() {
    return els.drawer && !els.drawer.hidden;
  }

  function openDrawer() {
    if (!els.drawer || drawerIsOpen()) return;
    els.drawer.hidden = false;
    document.body.classList.add("drawer-open");
    if (els.navToggle) {
      els.navToggle.setAttribute("aria-expanded", "true");
      els.navToggle.setAttribute("aria-label", "Close menu");
    }
    window.requestAnimationFrame(function () {
      if (els.drawer) els.drawer.classList.add("is-open");
    });
    window.setTimeout(function () {
      if (els.drawerClose) els.drawerClose.focus();
    }, 60);
  }

  function closeDrawer() {
    if (!drawerIsOpen()) return;
    els.drawer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    if (els.navToggle) {
      els.navToggle.setAttribute("aria-expanded", "false");
      els.navToggle.setAttribute("aria-label", "Open menu");
    }

    var finish = function () {
      if (els.drawer && !els.drawer.classList.contains("is-open")) els.drawer.hidden = true;
    };

    if (reducedMotion) {
      finish();
    } else {
      window.setTimeout(finish, 320);
    }
  }

  function initDrawer() {
    els.drawer = document.getElementById("navDrawer");
    if (!els.drawer) return;

    els.drawerClose = document.getElementById("navDrawerClose");

    if (els.navToggle) {
      els.navToggle.addEventListener("click", function () {
        if (drawerIsOpen()) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    }

    if (els.drawerClose) els.drawerClose.addEventListener("click", closeDrawer);

    els.drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeDrawer();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && drawerIsOpen()) closeDrawer();
    });

    window.addEventListener("hashchange", closeDrawer);
  }

  /* ---------- Marquees ---------- */

  function initAmbitionMarquee() {
    var track = document.getElementById("marqueeTrack");
    if (!track) return;

    var label = "Websites and identities that reflect your ambition";
    var base = '<span class="marquee-item">' + escapeHtml(label) + '</span><span class="marquee-star" aria-hidden="true">✳</span>';
    var side = "";
    for (var i = 0; i < 4; i += 1) side += base;

    track.innerHTML = side + side;
  }

  function renderBrands() {
    var track = document.getElementById("brandsTrack");
    if (!track) return;

    var names = projects().map(function (project) { return project.title; }).filter(Boolean);

    if (!names.length) {
      track.innerHTML = "";
      return;
    }

    var base = names.map(function (name) {
      return '<span class="brand-chip">' + escapeHtml(name) + ' <i aria-hidden="true">✳</i></span>';
    }).join("");

    var side = "";
    var rounds = names.length < 4 ? 3 : 2;
    for (var i = 0; i < rounds; i += 1) side += base;

    track.innerHTML = side + side;
  }

  /* ---------- Client wins rotator ---------- */

  function renderWins() {
    var stage = document.getElementById("winsStage");
    if (!stage) return;

    var yearEl = document.getElementById("winsYear");
    var list = projects();
    var years = list.map(function (project) { return Number(project.year) || 0; });
    if (yearEl) yearEl.textContent = String(Math.max.apply(null, years.concat([new Date().getFullYear()])));

    var items = list.filter(function (project) { return project.result; });

    if (!items.length) {
      stage.innerHTML = '<p class="wins-item is-active"><em>Every project starts with a business problem. Add a result to a project in the control panel and it appears here.</em></p>';
      winsCount = 0;
      return;
    }

    stage.innerHTML = items.map(function (project, index) {
      return '<p class="wins-item' + (index === 0 ? " is-active" : "") + '">' +
        "<strong>" + escapeHtml(project.result) + "</strong> " +
        "<em>" + escapeHtml(project.resultNote || project.title) + "</em></p>";
    }).join("");

    winsCount = items.length;
    winsIndex = 0;
    startWinsTimer();
  }

  function stepWins() {
    if (winsCount < 2) return;
    var nodes = els.winsStage ? els.winsStage.querySelectorAll(".wins-item") : [];
    if (!nodes.length) return;

    nodes[winsIndex].classList.remove("is-active");
    winsIndex = (winsIndex + 1) % nodes.length;
    nodes[winsIndex].classList.add("is-active");
  }

  function startWinsTimer() {
    if (winsTimer) window.clearInterval(winsTimer);
    if (winsCount < 2 || reducedMotion) return;
    winsTimer = window.setInterval(stepWins, 4600);
  }

  /* ---------- Success stories rail ---------- */

  function renderStories() {
    var rail = document.getElementById("storiesRail");
    if (!rail) return;

    var list = projects();
    var countEl = document.getElementById("storiesCount");
    if (countEl) countEl.textContent = pad(list.length);

    if (!list.length) {
      rail.innerHTML = '<p class="work-empty">No stories yet — add a project in the control panel and it appears here.</p>';
      return;
    }

    rail.innerHTML = list.map(function (project, index) {
      var title = escapeHtml(project.title);
      var id = escapeHtml(project.id);
      var image = safeUrl(project.image, true);
      var tags = Array.isArray(project.tags) ? project.tags : [];

      return '<article class="story-card" style="--i:' + index + '">' +
        '<p class="story-badge"><b>SS</b><span>/' + pad(list.length) + "</span></p>" +
        '<button class="story-media" type="button" data-open-project="' + id + '" aria-label="Open project: ' + title + '">' +
          '<span class="story-media-fallback" aria-hidden="true">' + escapeHtml(initials(project.title)) + "</span>" +
          (image ? '<img src="' + escapeHtml(image) + '" alt="' + title + ' project cover" loading="lazy" decoding="async">' : "") +
        "</button>" +
        '<h3 class="story-title">' + title + "</h3>" +
        (project.description ? '<p class="story-desc">' + escapeHtml(project.description) + "</p>" : "") +
        (tags.length ? '<ul class="story-tags">' + tags.map(function (tag) {
          return '<li class="story-tag">' + escapeHtml(tag) + "</li>";
        }).join("") + "</ul>" : "") +
        (project.result ? '<p class="story-stat"><b>' + escapeHtml(project.result) + "</b><span>" +
          escapeHtml(project.resultNote || "Result at launch") + "</span></p>" : "") +
        '<button class="story-link" type="button" data-open-project="' + id + '">View project <span aria-hidden="true">→</span></button>' +
      "</article>";
    }).join("");

    rail.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("error", function () { img.remove(); });
    });

    updateStoriesNav();
  }

  function updateStoriesNav() {
    var rail = els.storiesRail;
    if (!rail || !els.storiesPrev || !els.storiesNext) return;

    // The rail is padded so it bleeds to the viewport edge, and the browser
    // snaps cards to the padded content box — so "at the start" is the padding
    // offset, not zero.
    var pad = parseFloat(window.getComputedStyle(rail).paddingLeft) || 0;
    var max = rail.scrollWidth - rail.clientWidth;

    els.storiesPrev.disabled = rail.scrollLeft <= pad + 2;
    els.storiesNext.disabled = rail.scrollLeft >= max - pad - 4;
  }

  function stepStories(direction) {
    var rail = els.storiesRail;
    if (!rail) return;
    var card = rail.querySelector(".story-card");
    var distance = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: distance * direction, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function initStories() {
    els.storiesRail = document.getElementById("storiesRail");
    els.storiesPrev = document.getElementById("storiesPrev");
    els.storiesNext = document.getElementById("storiesNext");

    if (els.storiesPrev) {
      els.storiesPrev.addEventListener("click", function () { stepStories(-1); });
    }
    if (els.storiesNext) {
      els.storiesNext.addEventListener("click", function () { stepStories(1); });
    }
    if (els.storiesRail) {
      els.storiesRail.addEventListener("scroll", updateStoriesNav, { passive: true });
      window.addEventListener("resize", updateStoriesNav);
    }
  }

  /* ---------- Testimonial slider ---------- */

  function collectQuotes() {
    var data = settings();
    var out = [];

    for (var i = 1; i <= 3; i += 1) {
      var text = String(data["quote" + i] || "").trim();
      if (!text) continue;
      out.push({
        text: text,
        name: String(data["quote" + i + "Name"] || "").trim(),
        role: String(data["quote" + i + "Role"] || "").trim(),
        note: String(data["quote" + i + "Note"] || "").trim()
      });
    }

    return out;
  }

  function showQuote(index) {
    if (!quotes.length) return;
    quoteIndex = (index + quotes.length) % quotes.length;

    var nodes = els.quotesStage ? els.quotesStage.querySelectorAll(".quote-item") : [];
    nodes.forEach(function (node, i) {
      node.classList.toggle("is-active", i === quoteIndex);
    });

    if (els.quoteIndex) els.quoteIndex.textContent = pad(quoteIndex + 1);

    var dots = els.quotesDots ? els.quotesDots.querySelectorAll(".quotes-dot") : [];
    dots.forEach(function (dot, i) {
      var active = i === quoteIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
      dot.tabIndex = active ? 0 : -1;
    });
  }

  function renderQuotes() {
    if (!els.quotesStage) return;

    quotes = collectQuotes();

    var total = document.getElementById("quoteTotal");
    if (total) total.textContent = pad(quotes.length);

    if (!quotes.length) {
      els.quotesStage.innerHTML = '<p class="work-empty">Add a quote in the control panel and it appears here.</p>';
      if (els.quotesDots) els.quotesDots.innerHTML = "";
      return;
    }

    els.quotesStage.innerHTML = quotes.map(function (quote, index) {
      return '<figure class="quote-item' + (index === 0 ? " is-active" : "") + '">' +
        '<blockquote class="quote-text">' + escapeHtml(quote.text) + "</blockquote>" +
        '<figcaption class="quote-meta">' +
          (quote.name ? '<span class="quote-name">' + escapeHtml(quote.name) + "</span>" : "") +
          (quote.role ? '<span class="quote-role">' + escapeHtml(quote.role) + "</span>" : "") +
          (quote.note ? '<span class="quote-note">(' + escapeHtml(quote.note) + ")</span>" : "") +
        "</figcaption>" +
      "</figure>";
    }).join("");

    if (els.quotesDots) {
      els.quotesDots.innerHTML = quotes.map(function (quote, index) {
        var label = quote.name ? "Show testimonial from " + quote.name : "Show testimonial " + (index + 1);
        return '<button class="quotes-dot' + (index === 0 ? " is-active" : "") + '" type="button" role="tab"' +
          ' aria-selected="' + (index === 0 ? "true" : "false") + '" aria-label="' + escapeHtml(label) + '"' +
          ' data-quote="' + index + '"></button>';
      }).join("");
    }

    quoteIndex = 0;
    showQuote(0);
  }

  function initQuotes() {
    els.quotesStage = document.getElementById("quotesStage");
    els.quotesDots = document.getElementById("quotesDots");
    els.quoteIndex = document.getElementById("quoteIndex");

    var prev = document.getElementById("quotesPrev");
    var next = document.getElementById("quotesNext");

    if (prev) prev.addEventListener("click", function () { showQuote(quoteIndex - 1); });
    if (next) next.addEventListener("click", function () { showQuote(quoteIndex + 1); });

    if (els.quotesDots) {
      els.quotesDots.addEventListener("click", function (event) {
        var dot = event.target.closest("[data-quote]");
        if (dot) showQuote(Number(dot.getAttribute("data-quote")));
      });
    }

    if (els.quotesStage) {
      els.quotesStage.addEventListener("keydown", function (event) {
        if (event.key === "ArrowRight") showQuote(quoteIndex + 1);
        if (event.key === "ArrowLeft") showQuote(quoteIndex - 1);
      });
    }
  }

  /* ---------- FAQ accordion ---------- */

  function initFaqs() {
    var list = document.getElementById("faqList");
    if (!list) return;

    var all = Array.prototype.slice.call(list.querySelectorAll("details.faq"));

    all.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        all.forEach(function (other) {
          if (other !== item && other.open) other.open = false;
        });
      });
    });
  }

  /* ---------- Wiring ---------- */

  function refresh() {
    renderBrands();
    renderWins();
    renderStories();
    renderQuotes();
    updateStoriesNav();
  }

  function init() {
    cacheElements();
    initDrawer();
    initStories();
    initQuotes();
    initFaqs();
    initAmbitionMarquee();
    refresh();
  }

  function cacheElements() {
    els.navToggle = document.getElementById("navToggle");
    els.winsStage = document.getElementById("winsStage");
  }

  window.NUVSections = {
    refresh: refresh,
    closeDrawer: closeDrawer
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
