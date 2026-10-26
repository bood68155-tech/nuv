/*
 * NUV — public site.
 * Renders the settings-driven copy, portfolio grid and project lightbox.
 */
(function () {
  "use strict";

  var store = window.NUVStore;
  var state = {
    filter: "all",
    projects: [],
    settings: null
  };

  var els = {};
  var revealObserver = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  function handleFromUrl(url) {
    try {
      var parsed = new URL(url, window.location.href);
      var parts = parsed.pathname.split("/").filter(Boolean);
      if (!parts.length) return "";
      return "@" + decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      return "";
    }
  }

  function setText(el, value) {
    if (el) el.textContent = value == null ? "" : String(value);
  }

  function setMeta(selector, value) {
    var el = document.querySelector(selector);
    if (el && typeof value === "string") el.setAttribute("content", value);
  }

  function applySettings(settings) {
    state.settings = settings;

    document.title = settings.siteTitle || "NUV";
    setMeta('meta[name="description"]', settings.metaDescription);
    setMeta('meta[property="og:title"]', settings.siteTitle);
    setMeta('meta[property="og:description"]', settings.metaDescription);

    document.querySelectorAll("[data-text]").forEach(function (el) {
      var key = el.getAttribute("data-text");
      if (typeof settings[key] === "string") el.textContent = settings[key];
    });

    var yearEl = document.getElementById("footerYear");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    var email = String(settings.email || "").trim();
    var emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var emailBlock = document.getElementById("contactEmail");
    var emailLabel = document.getElementById("contactEmailLabel");
    var mailButton = document.getElementById("contactMailBtn");

    if (emailBlock) {
      emailBlock.hidden = !emailIsValid;
      if (emailIsValid) emailBlock.href = "mailto:" + email;
      setText(emailLabel, emailIsValid ? email : "Add an email in site settings");
    }
    if (mailButton) {
      mailButton.hidden = !emailIsValid;
      if (emailIsValid) mailButton.href = "mailto:" + email;
    }

    var instagram = safeUrl(settings.instagram);
    var instagramButton = document.getElementById("contactInstagram");
    var mobileInstagram = document.getElementById("mobileInstagram");
    if (instagramButton) {
      instagramButton.hidden = !instagram;
      if (instagram) instagramButton.href = instagram;
    }
    if (mobileInstagram) {
      mobileInstagram.hidden = !instagram;
      if (instagram) mobileInstagram.href = instagram;
    }

    var socials = [
      { label: "Instagram", url: instagram },
      { label: "LinkedIn", url: safeUrl(settings.linkedin) },
      { label: "X / Twitter", url: safeUrl(settings.x) }
    ].filter(function (item) { return Boolean(item.url); });

    var socialList = document.getElementById("socialLinks");
    if (socialList) {
      socialList.innerHTML = socials.map(function (item) {
        var handle = handleFromUrl(item.url);
        return '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' +
          "<span>" + escapeHtml(item.label) + "</span>" +
          '<span aria-hidden="true">' + (handle ? escapeHtml(handle) + " " : "") + "↗</span></a>";
      }).join("");
      var socialBlock = socialList.closest(".contact-block");
      if (socialBlock) socialBlock.hidden = socials.length === 0;
    }

    var phoneBlock = document.getElementById("phoneBlock");
    var phoneLink = document.getElementById("contactPhone");
    var phone = String(settings.phone || "").trim();
    if (phoneBlock) phoneBlock.hidden = !phone;
    if (phoneLink && phone) {
      phoneLink.textContent = phone;
      phoneLink.href = "tel:" + phone.replace(/[^\d+]/g, "");
    }
  }

  function filteredProjects() {
    if (state.filter === "all") return state.projects;
    return state.projects.filter(function (project) { return project.category === state.filter; });
  }

  function projectCard(project, index) {
    var image = safeUrl(project.image, true);
    var tags = Array.isArray(project.tags) ? project.tags : [];
    var id = escapeHtml(project.id);
    var title = escapeHtml(project.title);
    var cover = '<span class="work-cover-fallback" aria-hidden="true">' + escapeHtml(initials(project.title)) + "</span>" +
      (image ? '<img src="' + escapeHtml(image) + '" alt="' + title + ' project cover" loading="lazy" decoding="async">' : "") +
      '<span class="work-hover" aria-hidden="true">' +
        '<span class="work-hover-pill">' + escapeHtml(project.year) + "</span>" +
        '<span class="work-hover-pill">View project →</span>' +
      "</span>";

    return '<article class="work-card" style="--i:' + index + '">' +
      '<button class="work-cover" type="button" data-open-project="' + id + '" aria-label="Open project: ' + title + '">' + cover + "</button>" +
      '<div class="work-info">' +
        '<h3 class="work-name"><button type="button" data-open-project="' + id + '">' + title + "</button></h3>" +
        (project.description ? '<p class="work-summary">' + escapeHtml(project.description) + "</p>" : "") +
        (tags.length ? '<div class="work-tags">' + tags.map(function (tag) {
          return '<span class="work-tag">' + escapeHtml(tag) + "</span>";
        }).join("") + "</div>" : "") +
      "</div>" +
    "</article>";
  }

  function updateCounts() {
    var counts = {
      all: state.projects.length,
      web: 0,
      stores: 0,
      designs: 0
    };
    state.projects.forEach(function (project) {
      if (typeof counts[project.category] === "number") counts[project.category] += 1;
    });

    var total = document.getElementById("workCount");
    if (total) total.textContent = pad(counts.all);

    document.querySelectorAll("[data-filter-count]").forEach(function (el) {
      var key = el.getAttribute("data-filter-count");
      el.textContent = pad(counts[key] || 0);
    });
  }

  function renderWork() {
    if (!els.grid) return;
    var projects = filteredProjects();

    if (!projects.length) {
      els.grid.innerHTML = '<p class="work-empty">Nothing in this category yet — new work is on its way. In the meantime, the full portfolio is one filter away.</p>';
      return;
    }

    els.grid.innerHTML = projects.map(projectCard).join("");

    els.grid.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("error", function () {
        img.style.display = "none";
      });
    });
  }

  function setFilter(filter) {
    state.filter = filter;
    document.querySelectorAll(".filter-btn").forEach(function (button) {
      var active = button.getAttribute("data-filter") === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderWork();
  }

  function openProject(id) {
    var project = state.projects.find(function (item) { return item.id === id; });
    if (!project) return;

    var dialog = els.projectDialog;
    var image = safeUrl(project.image, true);
    var tags = Array.isArray(project.tags) ? project.tags : [];

    els.dialogTitle.textContent = project.title;
    els.dialogMeta.textContent = store.categoryLabel(project.category) + " — " + project.year;
    els.dialogDesc.textContent = project.description || "A recent NUV collaboration. Get in touch to hear the full story.";
    els.dialogFallback.textContent = initials(project.title);

    if (image) {
      els.dialogImage.hidden = false;
      els.dialogImage.src = image;
      els.dialogImage.alt = project.title + " project cover";
    } else {
      els.dialogImage.hidden = true;
      els.dialogImage.removeAttribute("src");
    }

    els.dialogImage.onerror = function () {
      els.dialogImage.hidden = true;
    };

    els.dialogTags.innerHTML = tags.map(function (tag) {
      return '<span class="work-tag">' + escapeHtml(tag) + "</span>";
    }).join("");

    var href = safeUrl(project.link);
    if (href) {
      els.dialogLink.hidden = false;
      els.dialogLink.href = href;
    } else {
      els.dialogLink.hidden = true;
      els.dialogLink.removeAttribute("href");
    }

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      document.body.classList.add("dialog-open");
      window.setTimeout(function () {
        if (els.dialogClose) els.dialogClose.focus();
      }, 30);
    }
  }

  function closeMobileMenu() {
    if (!els.header) return;
    els.header.classList.remove("menu-open");
    if (els.navToggle) els.navToggle.setAttribute("aria-expanded", "false");
    if (els.navToggle) els.navToggle.setAttribute("aria-label", "Open menu");
  }

  function toggleMobileMenu() {
    var open = !els.header.classList.contains("menu-open");
    els.header.classList.toggle("menu-open", open);
    els.navToggle.setAttribute("aria-expanded", String(open));
    els.navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function refresh() {
    state.projects = store.getProjects();
    applySettings(store.getSettings());
    updateCounts();
    renderWork();
  }

  function cacheElements() {
    els.header = document.getElementById("siteHeader");
    els.grid = document.getElementById("workGrid");
    els.navToggle = document.getElementById("navToggle");
    els.projectDialog = document.getElementById("projectDialog");
    els.dialogTitle = document.getElementById("projectDialogTitle");
    els.dialogMeta = document.getElementById("projectDialogMeta");
    els.dialogDesc = document.getElementById("projectDialogDesc");
    els.dialogTags = document.getElementById("projectDialogTags");
    els.dialogImage = document.getElementById("projectDialogImage");
    els.dialogFallback = document.getElementById("projectDialogFallback");
    els.dialogLink = document.getElementById("projectDialogLink");
    els.dialogClose = document.getElementById("projectDialogClose");
    els.toasts = document.getElementById("toasts");
  }

  function bindEvents() {
    document.querySelectorAll(".filter-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        setFilter(button.getAttribute("data-filter") || "all");
      });
    });

    if (els.grid) {
      els.grid.addEventListener("click", function (event) {
        var trigger = event.target.closest("[data-open-project]");
        if (trigger) openProject(trigger.getAttribute("data-open-project"));
      });
    }

    if (els.projectDialog) {
      els.projectDialog.addEventListener("click", function (event) {
        if (event.target === els.projectDialog) els.projectDialog.close();
      });
      els.projectDialog.addEventListener("close", function () {
        document.body.classList.remove("dialog-open");
      });
      if (els.dialogClose) {
        els.dialogClose.addEventListener("click", function () {
          els.projectDialog.close();
        });
      }
    }

    if (els.navToggle) {
      els.navToggle.addEventListener("click", toggleMobileMenu);
    }

    document.querySelectorAll(".mobile-menu a").forEach(function (link) {
      link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMobileMenu();
    });

    var backTop = document.getElementById("backTop");
    if (backTop) {
      backTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      });
    }

    var header = els.header;
    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    window.addEventListener("storage", function (event) {
      if (event.key === store.KEYS.settings || event.key === store.KEYS.projects || event.key === null) {
        refresh();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMobileMenu();
    });
  }

  function setupReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (!("IntersectionObserver" in window) || reducedMotion) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

    items.forEach(function (el) {
      el.classList.add("reveal");
      revealObserver.observe(el);
    });
  }

  function init() {
    cacheElements();
    state.projects = store.getProjects();
    applySettings(store.getSettings());
    updateCounts();
    renderWork();
    bindEvents();
    setupReveal();

    window.NUVApp = {
      refresh: refresh,
      openProject: openProject,
      setFilter: setFilter,
      toast: function (message, isError) {
        if (!els.toasts) return;
        var toast = document.createElement("div");
        toast.className = "toast" + (isError ? " is-error" : "");
        toast.textContent = message;
        els.toasts.appendChild(toast);
        window.setTimeout(function () {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(6px)";
          toast.style.transition = "opacity .3s ease, transform .3s ease";
          window.setTimeout(function () { toast.remove(); }, 320);
        }, 3200);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
