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

  var SOCIAL_ICONS = {
    Instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.9" r="1" fill="currentColor" stroke="none"/></svg>',
    LinkedIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4"/><path d="M7.6 10.4v6.2M7.6 7.6v.1M11.4 16.6v-6.2M11.4 12.9c0-1.5.9-2.3 2.1-2.3s2 .8 2 2.3v3.7"/></svg>',
    "X / Twitter": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4.5 4.5h3.4l4.2 5.6 4.6-5.6h2.8l-6 7.3 6.5 7.7h-3.4l-4.5-5.9-4.9 5.9H4.4l6.4-7.7z"/></svg>',
    Email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.2" y="5" width="17.6" height="14" rx="2.6"/><path d="m4.4 7.2 7.6 5.6 7.6-5.6"/></svg>'
  };

  function setText(el, value) {
    if (el) el.textContent = value == null ? "" : String(value);
  }

  function socialRow(item) {
    var handle = handleFromUrl(item.url);
    return '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' +
      "<span>" + escapeHtml(item.label) + "</span>" +
      '<span aria-hidden="true">' + (handle ? escapeHtml(handle) + " " : "") + "↗</span></a>";
  }

  function renderSocials(socials, email) {
    var markup = socials.map(socialRow).join("");

    var contactList = document.getElementById("socialLinks");
    if (contactList) {
      contactList.innerHTML = markup;
      var block = contactList.closest(".contact-block");
      if (block) block.hidden = socials.length === 0;
    }

    var footerList = document.getElementById("footerSocials");
    if (footerList) {
      footerList.innerHTML = markup || (email
        ? '<a href="mailto:' + escapeHtml(email) + '"><span>Email the studio</span><span aria-hidden="true">' + escapeHtml(email) + " ↗</span></a>"
        : '<p>Add Instagram, LinkedIn or X in the control panel and they appear here.</p>');
    }

    var drawerList = document.getElementById("drawerSocials");
    if (drawerList) {
      drawerList.innerHTML = markup || '<p class="drawer-value">Add Instagram, LinkedIn or X in the control panel.</p>';
    }

    var icons = document.getElementById("footerIcons");
    if (!icons) return;

    var entries = socials.slice();
    if (email) entries.push({ label: "Email", url: "mailto:" + email });

    icons.innerHTML = entries.map(function (item) {
      var external = item.url.indexOf("mailto:") === 0 ? "" : ' target="_blank" rel="noopener"';
      return '<a class="footer-icon" href="' + escapeHtml(item.url) + '"' + external +
        ' aria-label="' + escapeHtml(item.label) + '" title="' + escapeHtml(item.label) + '">' +
        (SOCIAL_ICONS[item.label] || SOCIAL_ICONS.Email) + "</a>";
    }).join("");
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

    var drawerEmail = document.getElementById("drawerEmail");
    if (drawerEmail) {
      drawerEmail.hidden = !emailIsValid;
      if (emailIsValid) {
        drawerEmail.href = "mailto:" + email;
        drawerEmail.textContent = email;
      }
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

    renderSocials(socials, emailIsValid ? email : "");

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

  function workRow(project, index) {
    var image = safeUrl(project.image, true);
    var tags = Array.isArray(project.tags) ? project.tags : [];
    var id = escapeHtml(project.id);
    var title = escapeHtml(project.title);

    return '<article class="work-row" style="--i:' + index + '" data-project-row="' + id + '"' +
      ' data-preview="' + escapeHtml(image) + '"' +
      ' data-preview-initials="' + escapeHtml(initials(project.title)) + '">' +
      '<div class="work-row-main">' +
        '<p class="work-row-top">' +
          "<span>" + escapeHtml(project.year) + "</span>" +
          (project.result ? "<span>" + escapeHtml(project.result) + "</span>" : "") +
          '<button class="work-row-link" type="button" data-open-project="' + id + '">View project <span aria-hidden="true">→</span></button>' +
        "</p>" +
        '<h3 class="work-row-title"><button type="button" data-open-project="' + id + '">' + title + "</button></h3>" +
        (project.description ? '<p class="work-row-desc">' + escapeHtml(project.description) + "</p>" : "") +
      "</div>" +
      '<ul class="work-row-tags">' + tags.map(function (tag) {
        return '<li class="work-tag">' + escapeHtml(tag) + "</li>";
      }).join("") + "</ul>" +
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

    els.grid.innerHTML = projects.map(workRow).join("");
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

    if (els.dialogResult) {
      if (project.result) {
        els.dialogResult.hidden = false;
        els.dialogResult.innerHTML = "<b>" + escapeHtml(project.result) + "</b>" +
          escapeHtml(project.resultNote || "Result at launch");
      } else {
        els.dialogResult.hidden = true;
        els.dialogResult.textContent = "";
      }
    }

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
    if (window.NUVSections && typeof window.NUVSections.refresh === "function") {
      window.NUVSections.refresh();
    }
  }

  /* ---------- Gaza studio clock ---------- */

  function startClock() {
    var clock = document.getElementById("footerClock");
    if (!clock) return;

    var dateEl = document.getElementById("footerClockDate");
    var zoneEl = document.getElementById("footerClockZone");
    var timeFormat = null;
    var dateFormat = null;
    var zoneFormat = null;

    try {
      timeFormat = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Gaza", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      });
      dateFormat = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Gaza", weekday: "long", day: "numeric", month: "long"
      });
      zoneFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Gaza", timeZoneName: "shortOffset" });
    } catch (error) {
      timeFormat = null;
    }

    function zoneLabel(now) {
      if (!zoneFormat) return "Gaza";
      var parts = zoneFormat.formatToParts(now);
      for (var i = 0; i < parts.length; i += 1) {
        if (parts[i].type === "timeZoneName") return parts[i].value;
      }
      return "Gaza";
    }

    function tick() {
      var now = new Date();
      if (!timeFormat) {
        var pad = function (value) { return value < 10 ? "0" + value : String(value); };
        clock.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
        if (dateEl) dateEl.textContent = "Local time";
        if (zoneEl) zoneEl.textContent = "no time-zone data";
        return;
      }
      clock.textContent = timeFormat.format(now);
      if (dateEl) dateEl.textContent = dateFormat.format(now);
      if (zoneEl) zoneEl.textContent = zoneLabel(now);
    }

    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------- About the founder ---------- */

  function initAbout() {
    var dialog = document.getElementById("aboutDialog");
    if (!dialog || typeof dialog.showModal !== "function") return;

    document.querySelectorAll("[data-open-about]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        closeMobileMenu();
        dialog.showModal();
        document.body.classList.add("dialog-open");
      });
    });

    document.querySelectorAll("[data-close-about]").forEach(function (closer) {
      closer.addEventListener("click", function () {
        dialog.close();
      });
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", function () {
      if (dialog.open) return;
      document.body.classList.remove("dialog-open");
    });
  }

  /* ---------- Ambient sound toggle ---------- */

  function initSound() {
    var button = document.getElementById("soundToggle");
    if (!button) return;

    var ambient = window.NUVAmbient;
    if (!ambient || !ambient.supported()) {
      button.hidden = true;
      return;
    }

    button.addEventListener("click", function () {
      var wasPlaying = ambient.isPlaying();
      var on = ambient.toggle();

      button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", on ? "Pause ambient sound" : "Play ambient sound");
      button.title = on ? "Ambient sound — pause" : "Ambient sound — play";

      if (!on && !wasPlaying) {
        toast("This browser would not start the ambient audio.", true);
      }
    });
  }

  /* ---------- Cursor preview for the work list ---------- */

  function initWorkPreview() {
    if (!els.grid) return;
    if (!window.matchMedia("(hover: hover) and (min-width: 1001px)").matches) return;

    var preview = document.createElement("div");
    preview.className = "work-preview";
    preview.setAttribute("aria-hidden", "true");
    preview.innerHTML = "<span></span><img alt=\"\">";
    document.body.appendChild(preview);

    var image = preview.querySelector("img");
    var fallback = preview.querySelector("span");
    var current = null;

    function hide() {
      current = null;
      preview.classList.remove("is-visible");
    }

    function place(event) {
      var half = preview.offsetWidth / 2;
      var x = Math.min(Math.max(event.clientX, half + 12), window.innerWidth - half - 12);
      var y = Math.min(Math.max(event.clientY, preview.offsetHeight / 2 + 12), window.innerHeight - preview.offsetHeight / 2 - 12);
      preview.style.left = x + "px";
      preview.style.top = y + "px";
    }

    image.addEventListener("error", function () { image.style.display = "none"; });

    els.grid.addEventListener("mousemove", function (event) {
      var row = event.target.closest("[data-project-row]");
      if (!row) {
        hide();
        return;
      }

      place(event);
      if (row === current) return;
      current = row;

      var src = row.getAttribute("data-preview");
      fallback.textContent = row.getAttribute("data-preview-initials") || "";

      if (src) {
        image.style.display = "";
        image.src = src;
      } else {
        image.style.display = "none";
        image.removeAttribute("src");
      }

      preview.classList.add("is-visible");
    });

    els.grid.addEventListener("mouseleave", hide);
    window.addEventListener("scroll", hide, { passive: true });
  }

  function toast(message, isError) {
    if (!els.toasts) return;
    var node = document.createElement("div");
    node.className = "toast" + (isError ? " is-error" : "");
    node.textContent = message;
    els.toasts.appendChild(node);
    window.setTimeout(function () {
      node.style.opacity = "0";
      node.style.transform = "translateY(6px)";
      node.style.transition = "opacity .3s ease, transform .3s ease";
      window.setTimeout(function () { node.remove(); }, 320);
    }, 3200);
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
    els.dialogResult = document.getElementById("projectDialogResult");
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

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-open-project]");
      if (trigger) openProject(trigger.getAttribute("data-open-project"));
    });

    if (els.projectDialog) {
      els.projectDialog.addEventListener("click", function (event) {
        if (event.target === els.projectDialog) els.projectDialog.close();
      });
      els.projectDialog.addEventListener("close", function () {
        // Ignore a close event queued by a previous dialog that lands after this
        // one has reopened, or the page would unlock behind an open modal.
        if (els.projectDialog.open) return;
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
    initWorkPreview();
    startClock();
    initAbout();
    initSound();

    window.NUVApp = {
      refresh: refresh,
      openProject: openProject,
      setFilter: setFilter,
      toast: toast
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
