/*
 * NUV® — project data layer.
 * Single source of truth for the "Success stories" list, shared by the public
 * site (index.html) and the admin panel (admin.html).
 *
 * Resolution order on the site:
 *   1. localStorage override (edits made in admin.html on this browser)
 *   2. data/projects.json (committed from the admin panel's export)
 *   3. DEFAULTS below (always works, even offline / file://)
 *
 * No dependencies. Safe to include on any page — it only renders when a
 * #workList container exists.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "nuv.projects.v1";
  var DATA_URL = "data/projects.json";

  var DEFAULTS = [
    {
      id: "meridian-arquitectos",
      title: "Meridian Arquitectos",
      meta: "Brand & website — 2026",
      image: "assets/works/meridian.svg",
      alt: "Meridian Arquitectos website design",
      desc: "Brand refresh and website for a practice with a decade of crafting high-end homes for Australian families.",
      longDesc: "A digital home for a Lisbon architecture practice: restrained typography, immersive project galleries and a CMS the studio actually enjoys using.",
      result: "+21%",
      resultNote: "Increase in conversions with projects starting from $2M+"
    },
    {
      id: "northwind-supply",
      title: "Northwind Supply",
      meta: "E-commerce — 2025",
      image: "assets/works/northwind.svg",
      alt: "Northwind Supply store website design",
      desc: "A storefront and identity system for an outdoor brand that needed its site to feel like the field it was made for.",
      longDesc: "An outdoor goods storefront built for speed and storytelling, with a mobile checkout that converts and a field-notes journal that keeps people coming back.",
      result: "3.1×",
      resultNote: "Return on ad spend in the first quarter after launch"
    },
    {
      id: "forme-studio",
      title: "Forme Studio",
      meta: "Visual identity — 2024",
      image: "assets/works/forma.svg",
      alt: "Forme Studio brand identity design",
      desc: "Visual identity and art direction for a furniture studio that makes quiet, considered objects.",
      longDesc: "A complete identity for a furniture studio: wordmark, art direction, print system and a brand manual that holds the whole language together.",
      result: "$180K",
      resultNote: "In new work within 30 days of launch"
    },
    {
      id: "atlas-pay",
      title: "Atlas Pay",
      meta: "Product & web — 2026",
      image: "assets/works/atlas.svg",
      alt: "Atlas Pay dashboard design",
      desc: "A payments platform rebuilt around clarity, from the marketing site to the dashboard finance teams live in.",
      longDesc: "Product design and front-end for a payments dashboard that turns complex transactions into a calm, legible experience for finance teams.",
      result: "−42%",
      resultNote: "Time spent reconciling transactions each month"
    },
    {
      id: "vera-skin",
      title: "Véra Skin",
      meta: "E-commerce & identity — 2024",
      image: "assets/works/vera.svg",
      alt: "Véra Skin e-commerce website design",
      desc: "A first online store for a botanical skincare label, built to make repeat buying feel effortless.",
      longDesc: "A botanical skincare brand's first online store: editorial product pages, subscriptions and a warm, tactile identity that feels as considered as the formulas.",
      result: "+64%",
      resultNote: "Repeat purchase rate after the redesign"
    },
    {
      id: "alma-journal",
      title: "Alma Journal",
      meta: "Editorial identity — 2026",
      image: "assets/works/alma.svg",
      alt: "Alma Journal editorial design",
      desc: "A printed and digital identity for a journal about the quiet architecture of belonging.",
      longDesc: "Editorial identity and art direction for an independent design journal, printed quarterly — a quiet system built to let photography and long-form writing breathe.",
      result: "12K",
      resultNote: "Paying subscribers in the first six months"
    }
  ];

  var FIELDS = ["id", "title", "meta", "image", "alt", "desc", "longDesc", "result", "resultNote"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    // Numeric character references keep this file free of raw markup chars.
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return "&#" + ch.charCodeAt(0) + ";";
    });
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  /* Normalises anything that comes back from storage / JSON into a clean list. */
  function normalize(list) {
    if (!Array.isArray(list)) return null;
    var clean = [];
    list.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var project = {};
      FIELDS.forEach(function (field) {
        project[field] = typeof item[field] === "string" ? item[field].trim() : "";
      });
      if (!project.title) return;
      if (!project.id) {
        project.id = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
      }
      if (!project.image) project.image = "assets/works/meridian.svg";
      if (!project.alt) project.alt = project.title + " project design by NUV";
      clean.push(project);
    });
    return clean.length ? clean : null;
  }

  function readLocal() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function writeLocal(list) {
    var clean = normalize(list);
    try {
      if (!clean) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch (error) {
      /* Private mode / storage full — the caller surfaces the message. */
    }
    return clean;
  }

  function clearLocal() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) { /* ignore */ }
  }

  /* Published data committed to data/projects.json.
     Skipped on file:// where the browser blocks fetches anyway. */
  function fetchSiteData() {
    if (typeof window.fetch !== "function") return Promise.resolve(null);
    if (window.location && window.location.protocol === "file:") return Promise.resolve(null);
    return window.fetch(DATA_URL, { cache: "no-cache" })
      .then(function (response) {
        return response && response.ok ? response.json() : null;
      })
      .then(function (data) {
        return normalize(data);
      })
      .catch(function () {
        return null;
      });
  }

  /* ---------- Site rendering ---------- */

  function projectMarkup(project, total) {
    var title = escapeHtml(project.title);
    var meta = escapeHtml(project.meta);
    var count = pad(total);
    return [
      '<article class="work-item" data-reveal>',
      '  <button class="work-media" type="button" data-open-project data-cursor="View"',
      '    data-project-title="' + title + '"',
      '    data-project-meta="' + meta + '"',
      '    data-project-desc="' + escapeHtml(project.longDesc) + '"',
      '    data-project-image="' + escapeHtml(project.image) + '"',
      '    data-project-result="' + escapeHtml(project.result) + '"',
      '    data-project-result-note="' + escapeHtml(project.resultNote) + '"',
      '    aria-label="Open the ' + title + ' case study">',
      '    <img src="' + escapeHtml(project.image) + '" alt="' + escapeHtml(project.alt) + '" loading="lazy">',
      '    <span class="work-media-tag mono">' + meta + "</span>",
      "  </button>",
      '  <div class="work-body">',
      '    <p class="work-index mono"><span>SS</span><span>/ ' + count + "</span></p>",
      "    <h3>" + title + "</h3>",
      '    <p class="work-desc">' + escapeHtml(project.desc) + "</p>",
      '    <p class="work-result"><b>' + escapeHtml(project.result) + "</b><span>" + escapeHtml(project.resultNote) + "</span></p>",
      '    <button class="link-arrow" type="button" data-open-project>View story <span aria-hidden="true">→</span></button>',
      "  </div>",
      "</article>"
    ].join("\n");
  }

  function renderCounters(total) {
    var count = pad(total);
    var headCount = document.getElementById("workCount");
    if (headCount) headCount.textContent = count;
    var foot = document.querySelector(".work-foot .mono");
    if (foot) foot.textContent = "(" + count + " selected stories)";
  }

  function render(list) {
    var container = document.getElementById("workList");
    var projects = normalize(list) || clone(DEFAULTS);
    if (!container) return projects;

    container.innerHTML = projects
      .map(function (project) { return projectMarkup(project, projects.length); })
      .join("\n");
    renderCounters(projects.length);

    // Fresh nodes need to be picked up by the scroll-reveal observer.
    if (window.NUVReveals && typeof window.NUVReveals.scan === "function") {
      window.NUVReveals.scan();
    }
    return projects;
  }

  function initSite() {
    var local = readLocal();
    var initial = render(local || clone(DEFAULTS));

    // Swap in the committed data once it arrives, unless this browser has
    // local admin edits, which always win.
    fetchSiteData().then(function (published) {
      if (!published || readLocal()) return;
      if (JSON.stringify(published) === JSON.stringify(initial)) return;
      render(published);
    });
  }

  window.NUVProjects = {
    STORAGE_KEY: STORAGE_KEY,
    DATA_URL: DATA_URL,
    FIELDS: FIELDS,
    DEFAULTS: clone(DEFAULTS),
    clone: clone,
    normalize: normalize,
    escapeHtml: escapeHtml,
    pad: pad,
    readLocal: readLocal,
    writeLocal: writeLocal,
    clearLocal: clearLocal,
    fetchSiteData: fetchSiteData,
    render: render
  };

  if (document.getElementById("workList")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initSite);
    } else {
      initSite();
    }
  }
})();
