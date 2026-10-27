/*
 * NUV® — intro-call booking.
 * A self-contained Cal.com-style scheduler: Gaza/Hebron month calendar,
 * 30-minute slots inside working hours, a details step, and a WhatsApp
 * handoff so the requested slot lands in Abood's messages.
 */
(function () {
  "use strict";

  var TZ = "Asia/Hebron";
  var WHATSAPP = "https://wa.me/970599608181";
  var SLOT_START = 9 * 60;
  var SLOT_END = 17 * 60;
  var STEP = 30;
  var LEAD_MINUTES = 60;
  var WINDOW_DAYS = 75;
  var WEEKEND = [5, 6]; // Friday and Saturday
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  var els = {};
  var state = {
    year: 0,
    month: 0,
    today: null,
    selected: null,
    booked: null
  };

  /* ---------- Time-zone helpers ---------- */

  var partsFormatter = null;
  var clockFormatter = null;

  try {
    partsFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      weekday: "short", hour12: false
    });
    clockFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false
    });
  } catch (error) {
    partsFormatter = null;
    clockFormatter = null;
  }

  var WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function partsOf(date) {
    if (partsFormatter) {
      var map = {};
      partsFormatter.formatToParts(date).forEach(function (part) {
        map[part.type] = part.value;
      });
      return {
        y: Number(map.year),
        m: Number(map.month) - 1,
        d: Number(map.day),
        hh: Number(map.hour) % 24,
        mm: Number(map.minute),
        ss: Number(map.second),
        weekday: WEEKDAY_INDEX[map.weekday] == null ? 0 : WEEKDAY_INDEX[map.weekday]
      };
    }
    var shifted = new Date(date.getTime() + 120 * 60000);
    return {
      y: shifted.getUTCFullYear(),
      m: shifted.getUTCMonth(),
      d: shifted.getUTCDate(),
      hh: shifted.getUTCHours(),
      mm: shifted.getUTCMinutes(),
      ss: shifted.getUTCSeconds(),
      weekday: shifted.getUTCDay()
    };
  }

  function offsetMinutes(date) {
    var p = partsOf(date);
    var asUtc = Date.UTC(p.y, p.m, p.d, p.hh, p.mm, p.ss);
    return Math.round((asUtc - date.getTime()) / 60000);
  }

  function offsetLabel(minutes) {
    var sign = minutes < 0 ? "-" : "+";
    var abs = Math.abs(minutes);
    var hours = Math.floor(abs / 60);
    var mins = abs % 60;
    return "GMT" + sign + hours + (mins ? ":" + (mins < 10 ? "0" + mins : mins) : "");
  }

  function instantFor(y, m, d, minutes) {
    var utcGuess = Date.UTC(y, m, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
    var instant = utcGuess;
    for (var i = 0; i < 3; i += 1) {
      var next = utcGuess - offsetMinutes(new Date(instant)) * 60000;
      if (next === instant) break;
      instant = next;
    }
    return new Date(instant);
  }

  function serial(y, m, d) {
    return Math.round(Date.UTC(y, m, d) / 86400000);
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  }

  function firstWeekdayIndex(y, m) {
    return (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Monday-first
  }

  function weekdayOf(y, m, d) {
    return new Date(Date.UTC(y, m, d)).getUTCDay();
  }

  function timeLabel(minutes) {
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    return (hours < 10 ? "0" + hours : String(hours)) + ":" + (mins < 10 ? "0" + mins : String(mins));
  }

  /* ---------- Availability ---------- */

  function slotIsOpen(y, m, d, minutes) {
    var seed = (y * 372 + (m + 1) * 31 + d) * 977 + minutes * 13;
    var value = Math.sin(seed) * 43758.5453;
    return value - Math.floor(value) > 0.3;
  }

  function openSlots(y, m, d) {
    if (WEEKEND.indexOf(weekdayOf(y, m, d)) !== -1) return [];
    var slots = [];
    for (var minutes = SLOT_START; minutes + STEP <= SLOT_END; minutes += STEP) {
      if (!slotIsOpen(y, m, d, minutes)) continue;
      if (instantFor(y, m, d, minutes).getTime() < Date.now() + LEAD_MINUTES * 60000) continue;
      slots.push(minutes);
    }
    return slots;
  }

  function dayDistance(y, m, d) {
    return serial(y, m, d) - serial(state.today.y, state.today.m, state.today.d);
  }

  function dayIsBookable(y, m, d) {
    var distance = dayDistance(y, m, d);
    if (distance < 0 || distance > WINDOW_DAYS) return false;
    return openSlots(y, m, d).length > 0;
  }

  function firstBookableDay(fromOffset) {
    var start = new Date(Date.UTC(state.today.y, state.today.m, state.today.d));
    for (var i = fromOffset; i <= WINDOW_DAYS; i += 1) {
      var day = new Date(start.getTime() + i * 86400000);
      var y = day.getUTCFullYear();
      var m = day.getUTCMonth();
      var d = day.getUTCDate();
      if (dayIsBookable(y, m, d)) return { y: y, m: m, d: d };
    }
    return null;
  }

  /* ---------- Rendering ---------- */

  function monthLabel(y, m) {
    return MONTHS[m] + " " + y;
  }

  function renderCalendar() {
    if (!els.days) return;
    els.month.textContent = monthLabel(state.year, state.month);

    var html = "";
    var pad = firstWeekdayIndex(state.year, state.month);
    var total = daysInMonth(state.year, state.month);
    var i;

    for (i = 0; i < pad; i += 1) {
      html += '<span class="book-day is-empty" aria-hidden="true"></span>';
    }

    for (i = 1; i <= total; i += 1) {
      var bookable = dayIsBookable(state.year, state.month, i);
      var isToday = serial(state.year, state.month, i) === serial(state.today.y, state.today.m, state.today.d);
      var isSelected = state.selected &&
        state.selected.y === state.year &&
        state.selected.m === state.month &&
        state.selected.d === i;
      var label = MONTHS[state.month] + " " + i + (bookable ? "" : " — unavailable");

      html += '<button class="book-day' + (isToday ? " is-today" : "") + (isSelected ? " is-selected" : "") + '"' +
        ' type="button" data-book-day="' + i + '"' +
        (bookable ? "" : " disabled") +
        ' aria-pressed="' + (isSelected ? "true" : "false") + '"' +
        ' aria-label="' + label + '">' + i + "</button>";
    }

    els.days.innerHTML = html;

    if (els.prev) {
      els.prev.disabled = !(state.year > state.today.y ||
        (state.year === state.today.y && state.month > state.today.m));
    }
    if (els.next) {
      var ahead = (state.year - state.today.y) * 12 + (state.month - state.today.m);
      els.next.disabled = ahead >= 4;
    }
  }

  function renderSlots() {
    if (!els.slots) return;

    if (!state.selected) {
      els.slotsTitle.textContent = "Available times";
      els.slots.innerHTML = '<p class="book-slots-empty">Every slot in reach is booked. Message us on WhatsApp and we will find a time.</p>';
      return;
    }

    var slots = openSlots(state.selected.y, state.selected.m, state.selected.d);
    els.slotsTitle.textContent = "Available times · " + MONTHS[state.selected.m].slice(0, 3) + " " + state.selected.d;

    if (!slots.length) {
      els.slots.innerHTML = '<p class="book-slots-empty">No times left on this day. Try the next one.</p>';
      return;
    }

    els.slots.innerHTML = slots.map(function (minutes) {
      return '<button class="book-slot" type="button" data-book-slot="' + minutes + '">' + timeLabel(minutes) + "</button>";
    }).join("");
  }

  function render() {
    renderCalendar();
    renderSlots();
  }

  function showView(view) {
    if (els.picker) els.picker.hidden = view !== "picker";
    if (els.form) els.form.hidden = view !== "form";
    if (els.done) els.done.hidden = view !== "done";
  }

  function selectDay(y, m, d) {
    state.selected = { y: y, m: m, d: d, minutes: null };
    state.year = y;
    state.month = m;
    render();
  }

  /* ---------- Steps ---------- */

  function longDate(y, m, d) {
    return WEEKDAYS[weekdayOf(y, m, d)] + ", " + d + " " + MONTHS[m] + " " + y;
  }

  function localComparison(instant) {
    var gazaOffset = offsetMinutes(instant);
    var localOffset = -instant.getTimezoneOffset();
    var localTime = instant.toLocaleString(undefined, {
      weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false
    });

    if (gazaOffset === localOffset) return "Your clock matches Hebron — same time for you.";
    return "That is " + localTime + " where you are (" + offsetLabel(localOffset) + ").";
  }

  function chooseSlot(minutes) {
    if (!state.selected) return;
    state.selected.minutes = minutes;

    var instant = instantFor(state.selected.y, state.selected.m, state.selected.d, minutes);

    els.summaryTime.textContent = longDate(state.selected.y, state.selected.m, state.selected.d) + " · " + timeLabel(minutes);
    els.summaryMeta.textContent = "30m · Google Meet · " + TZ + " (" + offsetLabel(offsetMinutes(instant)) + ")";
    els.summaryLocal.textContent = localComparison(instant);

    els.error.hidden = true;
    showView("form");

    var nameField = els.form.elements.namedItem("name");
    if (nameField) nameField.focus();
  }

  function showError(message, fieldName) {
    els.error.textContent = message;
    els.error.hidden = false;
    if (fieldName) {
      var field = els.form.elements.namedItem(fieldName);
      if (field) field.focus();
    }
  }

  function calendarUrl(name, email, notes) {
    var instant = instantFor(state.selected.y, state.selected.m, state.selected.d, state.selected.minutes);
    var end = new Date(instant.getTime() + 30 * 60000);
    var stamp = function (date) {
      return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
    };
    var details = "Intro call with " + name + " (" + email + ")." +
      (notes ? "\n\nNotes: " + notes : "") +
      "\n\nArrange the Google Meet link with Abood on WhatsApp.";
    var params = [
      ["action", "TEMPLATE"],
      ["text", "Intro call w/ Abood @ NUV"],
      ["dates", stamp(instant) + "/" + stamp(end)],
      ["details", details],
      ["location", "Google Meet"],
      ["ctz", TZ]
    ];
    return "https://calendar.google.com/calendar/render?" + params.map(function (pair) {
      return encodeURIComponent(pair[0]) + "=" + encodeURIComponent(pair[1]);
    }).join("&");
  }

  function submitBooking(event) {
    event.preventDefault();

    if (!state.selected || state.selected.minutes == null) {
      showView("picker");
      return;
    }

    var name = String(els.form.elements.namedItem("name").value || "").trim();
    var email = String(els.form.elements.namedItem("email").value || "").trim();
    var notes = String(els.form.elements.namedItem("notes").value || "").trim();

    if (!name) {
      showError("Please add your name so we know who to expect.", "name");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("That email address doesn't look right.", "email");
      return;
    }

    state.booked = { name: name, email: email, notes: notes };

    var dateLabel = longDate(state.selected.y, state.selected.m, state.selected.d);
    var stamped = dateLabel + " · " + timeLabel(state.selected.minutes) + " " + TZ;

    els.doneTitle.textContent = stamped;
    els.doneMeta.textContent = "30m · Google Meet · " + TZ + " · for " + name;
    els.calendarLink.href = calendarUrl(name, email, notes);

    var message = "Hi Abood, I'd like to book the intro call.\n\n" +
      "When: " + dateLabel + " at " + timeLabel(state.selected.minutes) + " (" + TZ + ")\n" +
      "Name: " + name + "\n" +
      "Email: " + email +
      (notes ? "\nProject: " + notes : "") +
      "\n\nBooked through nuv.agency";

    var link = WHATSAPP + "?text=" + encodeURIComponent(message);
    els.whatsapp.href = link;

    els.error.hidden = true;
    showView("done");

    window.open(link, "_blank", "noopener");
    if (els.doneBadge) els.doneBadge.focus();
  }

  /* ---------- Clock ---------- */

  function tickClock() {
    if (!els.nowClock) return;
    var now = new Date();
    els.nowClock.textContent = clockFormatter
      ? clockFormatter.format(now)
      : timeLabel(now.getHours() * 60 + now.getMinutes());
  }

  /* ---------- Wiring ---------- */

  function bind() {
    els.days.addEventListener("click", function (event) {
      var button = event.target.closest("[data-book-day]");
      if (!button || button.disabled) return;
      selectDay(state.year, state.month, Number(button.getAttribute("data-book-day")));
    });

    els.slots.addEventListener("click", function (event) {
      var button = event.target.closest("[data-book-slot]");
      if (!button) return;
      chooseSlot(Number(button.getAttribute("data-book-slot")));
    });

    if (els.prev) {
      els.prev.addEventListener("click", function () {
        var month = state.month - 1;
        var year = state.year;
        if (month < 0) { month = 11; year -= 1; }
        state.year = year;
        state.month = month;
        render();
      });
    }

    if (els.next) {
      els.next.addEventListener("click", function () {
        var month = state.month + 1;
        var year = state.year;
        if (month > 11) { month = 0; year += 1; }
        state.year = year;
        state.month = month;
        render();
      });
    }

    els.form.addEventListener("submit", submitBooking);

    if (els.back) {
      els.back.addEventListener("click", function () {
        showView("picker");
        render();
      });
    }

    if (els.restart) {
      els.restart.addEventListener("click", function () {
        showView("picker");
        render();
        if (els.month) els.month.scrollIntoView({ block: "nearest" });
      });
    }
  }

  function cacheElements() {
    els.picker = document.getElementById("bookPicker");
    if (!els.picker) return;
    els.form = document.getElementById("bookForm");
    els.done = document.getElementById("bookDone");
    els.days = document.getElementById("bookDays");
    els.slots = document.getElementById("bookSlots");
    els.slotsTitle = document.getElementById("bookSlotsTitle");
    els.month = document.getElementById("bookMonth");
    els.prev = document.getElementById("bookPrev");
    els.next = document.getElementById("bookNext");
    els.summaryTime = document.getElementById("bookSummaryTime");
    els.summaryMeta = document.getElementById("bookSummaryMeta");
    els.summaryLocal = document.getElementById("bookSummaryLocal");
    els.error = document.getElementById("bookError");
    els.doneTitle = document.getElementById("bookDoneTitle");
    els.doneMeta = document.getElementById("bookDoneMeta");
    els.doneBadge = document.querySelector(".book-done-badge");
    els.calendarLink = document.getElementById("bookCalendarLink");
    els.whatsapp = document.getElementById("bookWhatsapp");
    els.back = document.getElementById("bookBack");
    els.restart = document.getElementById("bookRestart");
    els.nowClock = document.getElementById("bookNowClock");
    els.tzOffset = document.getElementById("bookTzOffset");
  }

  function init() {
    cacheElements();
    if (!els.picker) return;

    var now = new Date();
    var parts = partsOf(now);
    state.today = { y: parts.y, m: parts.m, d: parts.d };
    state.year = parts.y;
    state.month = parts.m;

    var first = firstBookableDay(0);
    if (first) {
      state.selected = { y: first.y, m: first.m, d: first.d, minutes: null };
      state.year = first.y;
      state.month = first.m;
    }

    if (els.doneBadge) els.doneBadge.setAttribute("tabindex", "-1");
    if (els.tzOffset) els.tzOffset.textContent = offsetLabel(offsetMinutes(now));

    render();
    bind();
    tickClock();
    window.setInterval(tickClock, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
