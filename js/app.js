/*
 * NUV® — site behaviour.
 * Loader, navigation, scroll reveals, marquees, service previews, dialogs,
 * sound toggle, custom cursor and the live Gaza clock. No dependencies.
 */
(function () {
  "use strict";

  var WHATSAPP = "https://wa.me/970599608181";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function waLink(message) {
    return WHATSAPP + (message ? "?text=" + encodeURIComponent(message) : "");
  }

  /* ---------- Intro loader ---------- */

  function initLoader() {
    var loader = $("#loader");
    var counter = $("#loaderCount");
    var start = null;
    var duration = reducedMotion ? 0 : 850;

    function finish() {
      document.body.classList.add("is-ready");
      if (loader) {
        loader.classList.add("is-done");
        window.setTimeout(function () {
          loader.hidden = true;
        }, 950);
      }
    }

    if (!loader || !counter) {
      document.body.classList.add("is-ready");
      return;
    }

    function tick(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / Math.max(duration, 1), 1);
      counter.textContent = String(Math.round(progress * 100)).padStart(2, "0");
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        finish();
      }
    }

    if (duration === 0) {
      counter.textContent = "100";
      finish();
      return;
    }

    window.requestAnimationFrame(tick);
    // Never let a stalled frame keep the page behind the loader.
    window.setTimeout(function () {
      if (!loader.classList.contains("is-done")) {
        counter.textContent = "100";
        finish();
      }
    }, 2600);
  }

  /* ---------- Scroll bar + nav state ---------- */

  function initScrollChrome() {
    var bar = $("#scrollBar");
    var nav = $("#nav");
    var ticking = false;

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? window.scrollY / max : 0;
      if (bar) bar.style.transform = "scaleX(" + Math.min(Math.max(progress, 0), 1) + ")";
      if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 12);
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Nav section highlighting ---------- */

  function initSectionNav() {
    if (!("IntersectionObserver" in window)) return;

    var links = $$(".nav-links a[href^='#']");
    if (!links.length) return;

    var map = {};
    links.forEach(function (link) {
      map[link.getAttribute("href").slice(1)] = link;
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) { link.classList.remove("is-current"); });
        var link = map[entry.target.id];
        if (link) link.classList.add("is-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    ["work", "services", "process", "faqs"].forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* ---------- Mobile menu ---------- */

  function initMobileMenu() {
    var menu = $("#mobileMenu");
    var toggle = $("#menuToggle");
    var close = $("#menuClose");
    if (!menu || !toggle) return;

    var hideTimer = null;

    function open() {
      window.clearTimeout(hideTimer);
      menu.hidden = false;
      window.requestAnimationFrame(function () {
        menu.classList.add("is-open");
      });
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.classList.add("is-locked");
      if (close) window.setTimeout(function () { close.focus(); }, 120);
    }

    function closeMenu() {
      if (menu.hidden) return;
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("is-locked");
      hideTimer = window.setTimeout(function () {
        menu.hidden = true;
      }, 750);
    }

    toggle.addEventListener("click", function () {
      if (menu.hidden) open();
      else closeMenu();
    });

    if (close) close.addEventListener("click", closeMenu);

    $$("a, button", menu).forEach(function (item) {
      if (item === close) return;
      item.addEventListener("click", function () {
        if (!item.hasAttribute("data-open-about")) closeMenu();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1080) closeMenu();
    });
  }

  /* ---------- Marquees ---------- */

  function initMarquees() {
    $$("[data-marquee]").forEach(function (track) {
      var original = track.innerHTML;
      track.innerHTML = original + original;
      // Keep the loop seamless even when the content is narrower than the screen.
      if (track.scrollWidth < window.innerWidth) {
        track.innerHTML = original + original + original + original;
      }
    });
  }

  /* ---------- Scroll reveals ---------- */

  function initReveals() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    if (!("IntersectionObserver" in window) || reducedMotion) {
      items.forEach(function (item) { item.classList.add("is-in"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    items.forEach(function (item) { observer.observe(item); });
  }

  /* ---------- Services ---------- */

  var SERVICES = [
    {
      name: "Brand Strategy",
      image: "assets/works/meridian.svg",
      quote: "“A passionate team who listens deeply, collaborates openly, and always delivers with care. They treated our practice like it was their own.”",
      person: "Hana Radwan",
      role: "Director, Meridian Arquitectos",
      initials: "HR"
    },
    {
      name: "Visual Identity",
      image: "assets/works/forma.svg",
      quote: "“They found the sharpest version of our story and built a system that finally matches it. Everything feels considered now, down to the business card.”",
      person: "Layla Farouk",
      role: "Creative Director, Forme Studio",
      initials: "LF"
    },
    {
      name: "Website Strategy",
      image: "assets/works/northwind.svg",
      quote: "“They found the sharpest version of our story and built a site that finally matches it. The quality of enquiries changed within weeks, not months.”",
      person: "Tomas Meyer",
      role: "Founder, Northwind Supply",
      initials: "TM"
    },
    {
      name: "Website Design",
      image: "assets/works/vera.svg",
      quote: "“Genuinely the calmest project we have run. Decisions were quick because the thinking had already been done properly.”",
      person: "Layla Farouk",
      role: "Creative Director, Forme Studio",
      initials: "LF"
    },
    {
      name: "Website Development",
      image: "assets/works/atlas.svg",
      quote: "“The build is fast, quiet and easy for our team to update. Six months in, we still have not found anything to complain about.”",
      person: "Tomas Meyer",
      role: "Founder, Northwind Supply",
      initials: "TM"
    },
    {
      name: "3D Development",
      image: "assets/works/helios.svg",
      quote: "“The motion and 3D work gave the brand a dimension we could not explain in a deck. It simply feels alive.”",
      person: "Hana Radwan",
      role: "Director, Meridian Arquitectos",
      initials: "HR"
    }
  ];

  function initServices() {
    var list = $("#serviceList");
    if (!list) return;

    var rows = $$(".service-row", list);
    var quoteCard = $(".quote-card-service");
    var quote = $("#serviceQuote");
    var person = $("#serviceQuoteName");
    var role = $("#serviceQuoteRole");
    var initials = $(".quote-card-service .avatar");
    var image = $("#serviceImage");
    var tag = $("#servicePreviewTag");
    var indexEl = $("#serviceIndex");
    var preview = $(".services-preview");
    var cta = $("#serviceCta");
    var active = 0;
    var swapTimer = null;

    function render(index) {
      var service = SERVICES[index];
      if (!service || index === active) return;
      active = index;

      rows.forEach(function (row, i) {
        var isActive = i === index;
        row.classList.toggle("is-active", isActive);
        row.setAttribute("aria-pressed", String(isActive));
      });

      if (quoteCard) quoteCard.classList.add("is-swapping");
      if (preview) preview.classList.add("is-swapping");

      window.clearTimeout(swapTimer);
      swapTimer = window.setTimeout(function () {
        if (quote) quote.textContent = service.quote;
        if (person) person.textContent = service.person;
        if (role) role.textContent = service.role;
        if (initials) initials.textContent = service.initials;
        if (image) {
          image.src = service.image;
          image.alt = service.name + " work by NUV";
        }
        if (tag) tag.textContent = String(index + 1).padStart(2, "0") + " — " + service.name;
        if (indexEl) indexEl.textContent = String(index + 1).padStart(2, "0");

        if (quoteCard) quoteCard.classList.remove("is-swapping");
        if (preview) preview.classList.remove("is-swapping");
      }, reducedMotion ? 0 : 220);

      if (cta) {
        cta.href = waLink("Hi Abood, I would like to talk about " + service.name + " for my project.");
        cta.innerHTML = "Start with " + service.name + ' <span aria-hidden="true">↗</span>';
      }
    }

    rows.forEach(function (row, index) {
      var name = row.getAttribute("data-service-name") || "";
      row.setAttribute("aria-label", name + " — show what this includes");

      row.addEventListener("pointerenter", function (event) {
        if (event.pointerType === "touch") return;
        render(index);
      });
      row.addEventListener("focus", function () { render(index); });
      row.addEventListener("click", function () { render(index); });
    });

    if (cta) {
      cta.href = waLink("Hi Abood, I would like to talk about Brand Strategy for my project.");
    }
  }

  /* ---------- FAQ accordion ---------- */

  function initFaqs() {
    var list = $("#faqList");
    if (!list) return;

    var buttons = $$(".faq-q", list);

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var item = button.closest(".faq");
        var isOpen = item.classList.contains("is-open");

        buttons.forEach(function (other) {
          var otherItem = other.closest(".faq");
          otherItem.classList.remove("is-open");
          other.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          item.classList.add("is-open");
          button.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------- Dialogs ---------- */

  function openDialog(dialog) {
    if (!dialog || typeof dialog.showModal !== "function") return;
    if (dialog.open) return;
    dialog.showModal();
    document.body.classList.add("is-locked");
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  function initDialogs() {
    var booking = $("#bookingDialog");
    var about = $("#aboutDialog");
    var project = $("#projectDialog");

    $$("[data-open-booking]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var menu = $("#mobileMenu");
        if (menu && !menu.hidden) $("#menuClose").click();
        openDialog(booking);
      });
    });

    $$("[data-close-booking]").forEach(function (closer) {
      closer.addEventListener("click", function () { closeDialog(booking); });
    });

    $$("[data-open-about]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var menu = $("#mobileMenu");
        if (menu && !menu.hidden) $("#menuClose").click();
        openDialog(about);
      });
    });

    $$("[data-close-about]").forEach(function (closer) {
      closer.addEventListener("click", function () { closeDialog(about); });
    });

    $$("[data-close-project]").forEach(function (closer) {
      closer.addEventListener("click", function () { closeDialog(project); });
    });

    [booking, about, project].forEach(function (dialog) {
      if (!dialog) return;

      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) closeDialog(dialog);
      });

      dialog.addEventListener("close", function () {
        if (!document.querySelector("dialog[open]")) {
          document.body.classList.remove("is-locked");
        }
      });
    });

    // Process steps open the matching case study, so "see step in action"
    // always lands on real work rather than a dead link.
    document.addEventListener("click", function (event) {
      var stepButton = event.target.closest("[data-open-step]");
      if (!stepButton) return;
      var items = $$(".work-item");
      var item = items[Number(stepButton.getAttribute("data-open-step"))];
      var media = item ? $(".work-media", item) : null;
      if (media) media.click();
    });

    if (project) {
      var title = $("#projectTitle");
      var meta = $("#projectMeta");
      var desc = $("#projectDesc");
      var media = $("#projectImage");
      var result = $("#projectResult");
      var resultNote = $("#projectResultNote");
      var cta = $("#projectCta");

      document.addEventListener("click", function (event) {
        var trigger = event.target.closest("[data-open-project]");
        if (!trigger) return;

        var item = trigger.closest(".work-item");
        var source = item ? $(".work-media[data-project-title]", item) : null;
        if (!source) return;

        var projectTitle = source.getAttribute("data-project-title") || "Project";
        if (title) title.textContent = projectTitle;
        if (meta) meta.textContent = source.getAttribute("data-project-meta") || "";
        if (desc) desc.textContent = source.getAttribute("data-project-desc") || "";
        if (result) result.textContent = source.getAttribute("data-project-result") || "";
        if (resultNote) resultNote.textContent = source.getAttribute("data-project-result-note") || "";
        if (media) {
          media.src = source.getAttribute("data-project-image") || "";
          media.alt = projectTitle + " — project design by NUV";
        }
        if (cta) {
          cta.href = waLink("Hi Abood, I saw the " + projectTitle + " project and would like something similar.");
        }

        openDialog(project);
      });
    }
  }

  /* ---------- Sound ---------- */

  function initSound() {
    var button = $("#soundToggle");
    if (!button) return;

    var ambient = window.NUVAmbient;
    if (!ambient || !ambient.supported()) {
      button.hidden = true;
      return;
    }

    button.addEventListener("click", function () {
      var on = ambient.toggle();
      button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", on ? "Pause ambient sound" : "Play ambient sound");
      button.title = on ? "Ambient sound — pause" : "Ambient sound — play";
      button.classList.toggle("is-playing", on);
    });
  }

  /* ---------- Clock ---------- */

  function initClocks() {
    var footer = $("#footerClock");
    var hero = $("#heroClock");
    var year = $("#year");
    var formatter = null;
    var heroFormatter = null;

    try {
      formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hebron",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      heroFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hebron",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch (error) {
      formatter = null;
    }

    function tick() {
      var now = new Date();
      if (formatter) {
        if (footer) footer.textContent = formatter.format(now);
        if (hero) hero.textContent = heroFormatter.format(now);
      }
    }

    if (year) year.textContent = String(new Date().getFullYear());
    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------- Cursor ---------- */

  function initCursor() {
    if (!finePointer || reducedMotion) return;

    var cursor = $("#cursor");
    if (!cursor) return;
    var label = $(".cursor-label", cursor);
    var target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var current = { x: target.x, y: target.y };
    var visible = false;

    function loop() {
      current.x += (target.x - current.x) * 0.22;
      current.y += (target.y - current.y) * 0.22;
      cursor.style.transform = "translate3d(" + (current.x - cursor.offsetWidth / 2) + "px," +
        (current.y - cursor.offsetHeight / 2) + "px,0)";
      window.requestAnimationFrame(loop);
    }

    window.addEventListener("mousemove", function (event) {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!visible) {
        visible = true;
        cursor.classList.add("is-visible");
        current.x = target.x;
        current.y = target.y;
      }
    }, { passive: true });

    document.addEventListener("mouseover", function (event) {
      var trigger = event.target.closest("[data-cursor]");
      if (!trigger) return;
      if (label) label.textContent = trigger.getAttribute("data-cursor") || "View";
      cursor.classList.add("is-active");
    });

    document.addEventListener("mouseout", function (event) {
      var trigger = event.target.closest("[data-cursor]");
      if (!trigger) return;
      if (trigger.contains(event.relatedTarget)) return;
      cursor.classList.remove("is-active");
    });

    document.addEventListener("mouseleave", function () {
      cursor.classList.remove("is-visible");
      visible = false;
    });

    window.requestAnimationFrame(loop);
  }

  /* ---------- Voices (testimonial stage) ---------- */

  function initVoices() {
    var stack = $("#voicesStack");
    if (!stack) return;

    var voices = $$(".voice", stack);
    var section = $("#voices");
    var indexEl = $("#voiceIndex");
    var prev = $("#voicePrev");
    var next = $("#voiceNext");
    if (voices.length < 2) return;

    var index = 0;
    var timer = null;

    function show(nextIndex) {
      index = (nextIndex + voices.length) % voices.length;
      voices.forEach(function (voice, i) {
        var active = i === index;
        voice.classList.toggle("is-active", active);
        voice.setAttribute("aria-hidden", active ? "false" : "true");
      });
      if (indexEl) indexEl.textContent = String(index + 1).padStart(2, "0");
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      stop();
      if (reducedMotion) return;
      timer = window.setInterval(function () { show(index + 1); }, 7000);
    }

    if (prev) {
      prev.addEventListener("click", function () { show(index - 1); start(); });
    }
    if (next) {
      next.addEventListener("click", function () { show(index + 1); start(); });
    }
    if (section) {
      section.addEventListener("pointerenter", stop);
      section.addEventListener("pointerleave", start);
      section.addEventListener("focusin", stop);
      section.addEventListener("focusout", start);
    }

    show(0);
    start();
  }

  /* ---------- Init ---------- */

  function init() {
    initLoader();
    initScrollChrome();
    initSectionNav();
    initMobileMenu();
    initMarquees();
    initReveals();
    initVoices();
    initServices();
    initFaqs();
    initDialogs();
    initSound();
    initClocks();
    initCursor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
