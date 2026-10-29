/*
 * NUV® — admin panel behaviour.
 * Passcode gate (hashed, browser-local), project CRUD with localStorage
 * persistence, ordering, JSON import/export and publish status.
 *
 * Shares the data layer with the site through js/projects.js (NUVProjects).
 */
(function () {
  "use strict";

  var P = window.NUVProjects;
  if (!P) return;

  var PASS_KEY = "nuv.admin.pass";
  var SESSION_KEY = "nuv.admin.session";
  var SESSION_MS = 8 * 60 * 60 * 1000;
  var MIN_PASS = 4;

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  var state = {
    projects: [],
    published: null,
    editingId: null,
    mode: "login", // create | login | change
    feed: "off", // connecting | live | offline | unavailable | off
    live: false,
    writeFailed: false,
    unsubscribe: null
  };

  var els = {};

  /* ---------- Storage helpers ---------- */

  function getPassHash() {
    try {
      return window.localStorage.getItem(PASS_KEY);
    } catch (error) {
      return null;
    }
  }

  function setPassHash(value) {
    try {
      window.localStorage.setItem(PASS_KEY, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function hasSession() {
    try {
      var expiry = parseInt(window.sessionStorage.getItem(SESSION_KEY) || "0", 10);
      return expiry > Date.now();
    } catch (error) {
      return false;
    }
  }

  function startSession() {
    try {
      window.sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MS));
    } catch (error) { /* ignore */ }
  }

  function endSession() {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch (error) { /* ignore */ }
  }

  /* SHA-256 when the browser exposes it (secure contexts), FNV-1a otherwise. */
  function hashPasscode(text) {
    var salted = "nuv-admin:" + text;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      return window.crypto.subtle.digest("SHA-256", new window.TextEncoder().encode(salted))
        .then(function (buffer) {
          return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
            return byte.toString(16).padStart(2, "0");
          }).join("");
        })
        .catch(function () { return fallbackHash(salted); });
    }
    return Promise.resolve(fallbackHash(salted));
  }

  function fallbackHash(text) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return "fnv" + hash.toString(16);
  }

  /* ---------- Toast ---------- */

  var toastTimer = null;

  function toast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.hidden = false;
    // Restart the entrance animation on repeat uses.
    els.toast.style.animation = "none";
    void els.toast.offsetHeight;
    els.toast.style.animation = "";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.hidden = true;
    }, 3200);
  }

  function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
  }

  function clearError(element) {
    if (!element) return;
    element.hidden = true;
    element.textContent = "";
  }

  /* ---------- Gate ---------- */

  function setGateMode(mode) {
    state.mode = mode;
    clearError(els.gateError);
    els.gateForm.reset();

    var isCreate = mode === "create";
    var isChange = mode === "change";

    els.gateConfirmRow.hidden = !isCreate && !isChange;
    els.gatePass.autocomplete = isChange ? "current-password" : (isCreate ? "new-password" : "current-password");

    if (isCreate) {
      els.gateTitle.textContent = "Create your passcode";
      els.gateNote.textContent = "This panel is unlocked once per browser. Choose a passcode of at least " + MIN_PASS + " characters.";
      els.gateSubmit.textContent = "Set passcode and unlock";
    } else if (isChange) {
      els.gateTitle.textContent = "Change passcode";
      els.gateNote.textContent = "Confirm the current passcode, then choose a new one.";
      els.gateSubmit.textContent = "Update passcode";
    } else {
      els.gateTitle.textContent = "Admin access";
      els.gateNote.textContent = "Enter the passcode to manage projects, case studies and showcases.";
      els.gateSubmit.textContent = "Unlock panel";
    }
  }

  function showGateOverlay(mode) {
    setGateMode(mode);
    els.gate.hidden = false;
    els.gate.classList.add("is-overlay");
    document.body.classList.add("is-locked");
    window.setTimeout(function () { els.gatePass.focus(); }, 60);
  }

  function closeGateOverlay() {
    els.gate.classList.remove("is-overlay");
    els.gate.hidden = true;
    document.body.classList.remove("is-locked");
  }

  function openApp() {
    els.gate.hidden = true;
    els.app.hidden = false;
    document.body.classList.remove("is-locked");
  }

  function handleGateSubmit(event) {
    event.preventDefault();
    var value = els.gatePass.value;
    var stored = getPassHash();

    if (value.length < MIN_PASS) {
      showError(els.gateError, "Use at least " + MIN_PASS + " characters.");
      return;
    }

    if (state.mode === "create" || (!stored && state.mode !== "change")) {
      if (value !== els.gateConfirm.value) {
        showError(els.gateError, "The two passcodes do not match.");
        return;
      }
      hashPasscode(value).then(function (hash) {
        if (!setPassHash(hash)) {
          showError(els.gateError, "This browser blocked local storage, so the panel cannot lock itself.");
          return;
        }
        startSession();
        els.gateForm.reset();
        openApp();
        toast("Passcode set — welcome");
      });
      return;
    }

    hashPasscode(value).then(function (hash) {
      if (hash !== stored) {
        showError(els.gateError, "That passcode is not correct.");
        els.gatePass.select();
        return;
      }

      if (state.mode === "change") {
        var next = els.gateConfirm.value;
        if (next.length < MIN_PASS) {
          showError(els.gateError, "The new passcode needs at least " + MIN_PASS + " characters.");
          return;
        }
        hashPasscode(next).then(function (nextHash) {
          setPassHash(nextHash);
          els.gateForm.reset();
          closeGateOverlay();
          toast("Passcode updated");
        });
        return;
      }

      startSession();
      els.gateForm.reset();
      openApp();
    });
  }

  /* ---------- Data ---------- */

  function loadProjects() {
    if (state.unsubscribe) {
      state.unsubscribe();
      state.unsubscribe = null;
    }

    state.live = false;
    state.writeFailed = false;
    state.feed = P.isFirebaseConfigured() ? "connecting" : "off";

    // Paint the cached list instantly; the live feed replaces it on arrival.
    var local = P.readLocal();
    if (local) {
      state.projects = local;
      renderList();
    }

    /* Firebase not in play: the committed JSON / local cache stays the source. */
    function staticFallback() {
      if (state.projects.length) {
        updatePublishNote();
        return;
      }
      P.fetchSiteData().then(function (published) {
        state.projects = published || P.clone(P.DEFAULTS);
        renderList();
        updatePublishNote();
      });
    }

    if (P.isFirebaseConfigured()) {
      P.subscribeProjects(
        function (projects) {
          state.live = true;
          state.feed = "live";
          state.projects = projects;
          renderList();
          updatePublishNote();
        },
        function (status) {
          state.feed = status;
          updatePublishNote();
        }
      ).then(function (unsubscribe) {
        if (unsubscribe) {
          state.unsubscribe = unsubscribe;
          return;
        }
        state.feed = "unavailable";
        staticFallback();
      });
    } else {
      staticFallback();
    }

    P.fetchSiteData().then(function (published) {
      state.published = published;
      updatePublishNote();
    });
  }

  function saveProjects(message) {
    P.writeLocal(state.projects);
    renderList();
    updatePublishNote();

    var configured = P.isFirebaseConfigured();
    var base = message || (configured
      ? "Saved"
      : "Saved — refresh the site to preview");

    if (!configured) {
      toast(base);
      return;
    }

    // Every mutation (save, delete, reorder, import, reset) publishes the
    // whole list in one batch, so Firestore is always the full truth.
    P.remoteSync(P.clone(state.projects)).then(function () {
      state.writeFailed = false;
      updatePublishNote();
      toast(base + " — live on the site");
    }).catch(function () {
      state.writeFailed = true;
      updatePublishNote();
      toast(base + " in this browser only — Firestore write failed");
    });
  }

  function sameAsPublished() {
    if (!state.published) return false;
    return JSON.stringify(state.published) === JSON.stringify(state.projects);
  }

  function updatePublishNote() {
    if (!els.publishNote) return;

    var text = "";

    if (state.writeFailed) {
      text = "Last Firestore write failed — these changes live only in this browser. Check the security rules on the projects collection.";
    } else if (state.feed === "live") {
      text = "Live via Firestore — every save here reaches the site in real time, no export or commit needed.";
    } else if (state.feed === "connecting") {
      text = "Connecting to Firestore…";
    } else if (state.feed === "offline" || state.feed === "unavailable") {
      text = "Firestore unreachable — edits stay in this browser, visitors keep seeing the last live list.";
    } else if (state.published && !sameAsPublished()) {
      text = "Unpublished changes: this browser shows your local edits, visitors still see the committed data/projects.json. Download it and commit to publish.";
    } else if (state.published && sameAsPublished()) {
      text = "Published data matches what visitors see.";
    }

    if (text) {
      els.publishNote.hidden = false;
      els.publishNote.textContent = text;
    } else {
      els.publishNote.hidden = true;
    }
  }

  /* ---------- List ---------- */

  function cardMarkup(project, index, total) {
    var esc = P.escapeHtml;
    return [
      '<article class="pcard" data-id="' + esc(project.id) + '">',
      '  <div class="pcard-thumb"><img src="' + esc(project.image) + '" alt="" loading="lazy"></div>',
      '  <div class="pcard-main">',
      '    <p class="mono">' + esc(project.meta || "Untitled meta") + "</p>",
      "    <h3>" + esc(project.title) + "</h3>",
      '    <p class="pcard-desc">' + esc(project.desc || project.longDesc || "No summary yet.") + "</p>",
      '    <p class="pcard-result"><b>' + esc(project.result || "—") + "</b><span>" + esc(project.resultNote || "") + "</span></p>",
      "  </div>",
      '  <div class="pcard-actions">',
      '    <div class="pcard-order">',
      '      <button class="btn" type="button" data-action="up" ' + (index === 0 ? "disabled" : "") + ' aria-label="Move ' + esc(project.title) + ' up">↑</button>',
      '      <button class="btn" type="button" data-action="down" ' + (index === total - 1 ? "disabled" : "") + ' aria-label="Move ' + esc(project.title) + ' down">↓</button>',
      "    </div>",
      '    <button class="btn" type="button" data-action="edit">Edit</button>',
      '    <button class="btn btn-danger" type="button" data-action="delete">Delete</button>',
      "  </div>",
      "</article>"
    ].join("\n");
  }

  function renderList() {
    if (!els.list) return;
    els.list.innerHTML = state.projects
      .map(function (project, index) {
        return cardMarkup(project, index, state.projects.length);
      })
      .join("\n");
    els.statCount.textContent = P.pad(state.projects.length);
    els.listEmpty.hidden = state.projects.length > 0;
  }

  function findIndex(id) {
    for (var i = 0; i < state.projects.length; i++) {
      if (state.projects[i].id === id) return i;
    }
    return -1;
  }

  function move(id, direction) {
    var index = findIndex(id);
    var target = index + direction;
    if (index < 0 || target < 0 || target >= state.projects.length) return;
    var next = state.projects.slice();
    var moved = next.splice(index, 1)[0];
    next.splice(target, 0, moved);
    state.projects = next;
    saveProjects("Order updated");
    var button = els.list.querySelector('.pcard[data-id="' + id + '"] [data-action="' + (direction < 0 ? "up" : "down") + '"]');
    if (button && !button.disabled) button.focus();
  }

  function remove(id) {
    var index = findIndex(id);
    if (index < 0) return;
    var project = state.projects[index];
    if (!window.confirm('Delete "' + project.title + '"? This cannot be undone.')) return;
    state.projects.splice(index, 1);
    if (state.editingId === id) closeEditor();
    saveProjects("Project deleted");
  }

  /* ---------- Editor ---------- */

  function uniqueId(title) {
    var base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
    var id = base;
    var suffix = 2;
    while (findIndex(id) > -1 && id !== state.editingId) {
      id = base + "-" + suffix;
      suffix++;
    }
    return id;
  }

  function openEditor(project) {
    state.editingId = project ? project.id : null;
    els.projectForm.reset();
    clearError(els.formError);

    els.fTitle.value = project ? project.title : "";
    els.fMeta.value = project ? project.meta : "";
    els.fImage.value = project ? project.image : "assets/works/meridian.svg";
    els.fAlt.value = project ? project.alt : "";
    els.fDesc.value = project ? project.desc : "";
    els.fLongDesc.value = project ? project.longDesc : "";
    els.fResult.value = project ? project.result : "";
    els.fResultNote.value = project ? project.resultNote : "";
    updatePreview();

    els.editorKicker.textContent = project ? "Editing" : "New project";
    els.editorTitle.textContent = project ? project.title : "Untitled project";
    els.editor.hidden = false;
    els.editor.scrollIntoView({ block: "nearest", behavior: "smooth" });
    window.setTimeout(function () { els.fTitle.focus(); }, 80);
  }

  function closeEditor() {
    state.editingId = null;
    if (els.editor) els.editor.hidden = true;
  }

  function updatePreview() {
    if (!els.previewImage) return;
    var value = els.fImage.value.trim();
    els.previewImage.src = value || "assets/works/meridian.svg";
  }

  function handleSave(event) {
    event.preventDefault();
    var title = els.fTitle.value.trim();
    if (!title) {
      showError(els.formError, "A title is required.");
      els.fTitle.focus();
      return;
    }

    var draft = {
      title: title,
      meta: els.fMeta.value.trim(),
      image: els.fImage.value.trim() || "assets/works/meridian.svg",
      alt: els.fAlt.value.trim(),
      desc: els.fDesc.value.trim(),
      longDesc: els.fLongDesc.value.trim(),
      result: els.fResult.value.trim(),
      resultNote: els.fResultNote.value.trim()
    };

    if (state.editingId) {
      var index = findIndex(state.editingId);
      if (index > -1) {
        draft.id = state.editingId;
        state.projects[index] = draft;
      }
    } else {
      draft.id = uniqueId(title);
      state.projects.push(draft);
    }

    saveProjects();
    closeEditor();
  }

  /* ---------- Import / export / reset ---------- */

  function exportJson() {
    var blob = new Blob([JSON.stringify(state.projects, null, 2) + "\n"], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "projects.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast("Downloaded — save it as data/projects.json and commit");
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        var clean = P.normalize(parsed);
        if (!clean) {
          toast("That file has no valid projects");
          return;
        }
        state.projects = clean;
        closeEditor();
        saveProjects("Imported " + clean.length + " projects");
      } catch (error) {
        toast("Could not read that JSON file");
      }
    };
    reader.onerror = function () {
      toast("Could not read that file");
    };
    reader.readAsText(file);
  }

  /* ---------- Wiring ---------- */

  function bindGate() {
    els.gateForm.addEventListener("submit", handleGateSubmit);
  }

  function bindApp() {
    els.btnNew.addEventListener("click", function () { openEditor(null); });
    els.btnNewEmpty.addEventListener("click", function () { openEditor(null); });
    els.btnCloseEditor.addEventListener("click", closeEditor);
    els.btnCancel.addEventListener("click", closeEditor);
    els.projectForm.addEventListener("submit", handleSave);
    els.fImage.addEventListener("input", updatePreview);

    els.list.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action]");
      if (!button) return;
      var card = button.closest(".pcard");
      if (!card) return;
      var id = card.getAttribute("data-id");
      var action = button.getAttribute("data-action");

      if (action === "up") move(id, -1);
      else if (action === "down") move(id, 1);
      else if (action === "edit") {
        var editIndex = findIndex(id);
        if (editIndex > -1) openEditor(state.projects[editIndex]);
      }
      else if (action === "delete") remove(id);
    });

    els.btnExport.addEventListener("click", exportJson);
    els.btnImport.addEventListener("click", function () { els.fileInput.click(); });
    els.fileInput.addEventListener("change", function () {
      if (els.fileInput.files && els.fileInput.files[0]) {
        importFile(els.fileInput.files[0]);
        els.fileInput.value = "";
      }
    });

    els.btnResetLocal.addEventListener("click", function () {
      if (!window.confirm("Discard this browser's edits and go back to the committed data/projects.json?")) return;
      P.clearLocal();
      closeEditor();
      loadProjects();
      toast("Local edits discarded");
    });

    els.btnResetDefaults.addEventListener("click", function () {
      if (!window.confirm("Replace everything with the original six projects?")) return;
      state.projects = P.clone(P.DEFAULTS);
      closeEditor();
      saveProjects("Original content restored");
    });

    els.btnChangePass.addEventListener("click", function () { showGateOverlay("change"); });

    els.btnLogout.addEventListener("click", function () {
      endSession();
      window.location.reload();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!els.editor.hidden) closeEditor();
      else if (els.gate.classList.contains("is-overlay")) closeGateOverlay();
    });
  }

  function init() {
    els.gate = $("#gate");
    els.gateForm = $("#gateForm");
    els.gateTitle = $("#gateTitle");
    els.gateNote = $("#gateNote");
    els.gatePass = $("#gatePass");
    els.gateConfirm = $("#gateConfirm");
    els.gateConfirmRow = $("#gateConfirmRow");
    els.gateError = $("#gateError");
    els.gateSubmit = $("#gateSubmit");
    els.app = $("#app");
    els.statCount = $("#statCount");
    els.publishNote = $("#publishNote");
    els.list = $("#projectList");
    els.listEmpty = $("#listEmpty");
    els.editor = $("#editor");
    els.projectForm = $("#projectForm");
    els.editorKicker = $("#editorKicker");
    els.editorTitle = $("#editorTitle");
    els.previewImage = $("#previewImage");
    els.formError = $("#formError");
    els.fTitle = $("#fTitle");
    els.fMeta = $("#fMeta");
    els.fImage = $("#fImage");
    els.fAlt = $("#fAlt");
    els.fDesc = $("#fDesc");
    els.fLongDesc = $("#fLongDesc");
    els.fResult = $("#fResult");
    els.fResultNote = $("#fResultNote");
    els.fileInput = $("#fileInput");
    els.btnNew = $("#btnNew");
    els.btnNewEmpty = $("#btnNewEmpty");
    els.btnCloseEditor = $("#btnCloseEditor");
    els.btnCancel = $("#btnCancel");
    els.btnExport = $("#btnExport");
    els.btnImport = $("#btnImport");
    els.btnResetLocal = $("#btnResetLocal");
    els.btnResetDefaults = $("#btnResetDefaults");
    els.btnChangePass = $("#btnChangePass");
    els.btnLogout = $("#btnLogout");
    els.toast = $("#toast");

    bindGate();
    bindApp();
    loadProjects();

    if (!getPassHash()) {
      setGateMode("create");
    } else if (hasSession()) {
      openApp();
    } else {
      setGateMode("login");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
