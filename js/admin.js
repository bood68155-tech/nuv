/*
 * NUV — admin control panel.
 * Hash-routed overlay at #/admin (also reachable at /admin/).
 * Reads and writes the same localStorage content the public site renders.
 */
(function () {
  "use strict";

  var store = window.NUVStore;
  var state = {
    open: false,
    tab: "projects",
    editingId: null,
    lastFocus: null
  };

  var els = {};

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

  function toast(message, isError) {
    if (window.NUVApp && typeof window.NUVApp.toast === "function") {
      window.NUVApp.toast(message, isError);
    }
  }

  function normalizeUrl(value) {
    var raw = String(value == null ? "" : value).trim();
    if (!raw) return "";
    if (/^(javascript|vbscript|data):/i.test(raw)) return "";
    if (/^(https?:\/\/|mailto:|tel:|#|\/|\.\/|\.\.\/|assets\/)/i.test(raw)) return raw;
    return "https://" + raw;
  }

  function normalizeImage(value) {
    var raw = String(value == null ? "" : value).trim();
    if (!raw) return "";
    if (/^data:image\//i.test(raw)) return raw;
    if (/^(javascript|vbscript|data):/i.test(raw)) return "";
    if (/^(https?:\/\/|\/|\.\/|\.\.\/|assets\/)/i.test(raw)) return raw;
    return "https://" + raw;
  }

  function isAdminHash() {
    return /^#\/?admin(\/|\?|$)/.test(window.location.hash);
  }

  function setAdminTitle() {
    var name = store.getSettings().brandName || "NUV";
    var label = state.tab === "settings" ? "Site settings" : "Projects";
    document.title = label + " — " + name + " Admin";
  }

  /* ---------- Tabs ---------- */

  function switchTab(tab) {
    state.tab = tab === "settings" ? "settings" : "projects";

    document.querySelectorAll("[data-admin-tab]").forEach(function (button) {
      var active = button.getAttribute("data-admin-tab") === state.tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });

    var projectsPanel = document.getElementById("panel-projects");
    var settingsPanel = document.getElementById("panel-settings");
    if (projectsPanel) projectsPanel.hidden = state.tab !== "projects";
    if (settingsPanel) settingsPanel.hidden = state.tab !== "settings";

    if (state.open) setAdminTitle();
  }

  /* ---------- Project list ---------- */

  function renderAdminProjects() {
    var projects = store.getProjects();
    var count = document.getElementById("projectTabCount");
    if (count) count.textContent = pad(projects.length);
    if (!els.projectList) return;

    if (!projects.length) {
      els.projectList.innerHTML = '<div class="admin-empty">No projects yet. Use <strong>Add project</strong> to publish the first one — it will appear in the portfolio grid immediately.</div>';
      return;
    }

    els.projectList.innerHTML = projects.map(function (project) {
      var image = project.image;
      var thumb = '<span class="admin-thumb-fallback" aria-hidden="true">' + escapeHtml(initials(project.title)) + "</span>" +
        (image ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy">' : "");
      var label = store.categoryLabel(project.category);
      var liked = project.link ? "<span>Linked</span>" : "";
      var result = project.result ? "<span>" + escapeHtml(project.result) + "</span>" : "";
      return '<div class="admin-item" data-project-id="' + escapeHtml(project.id) + '">' +
        '<div class="admin-item-thumb" aria-hidden="true">' + thumb + "</div>" +
        '<div class="admin-item-body">' +
          "<h3>" + escapeHtml(project.title) + "</h3>" +
          '<p class="admin-item-meta"><span>' + escapeHtml(label) + "</span><span>" + escapeHtml(project.year) + "</span>" + result + liked + "</p>" +
          '<p class="admin-item-desc">' + escapeHtml(project.description || "No description yet.") + "</p>" +
        "</div>" +
        '<div class="admin-item-actions">' +
          '<button class="mini-btn" type="button" data-edit-project="' + escapeHtml(project.id) + '">Edit</button>' +
          '<button class="mini-btn danger" type="button" data-delete-project="' + escapeHtml(project.id) + '">Delete</button>' +
        "</div>" +
      "</div>";
    }).join("");

    els.projectList.querySelectorAll(".admin-item-thumb img").forEach(function (img) {
      img.addEventListener("error", function () { img.remove(); });
    });
  }

  function initials(value) {
    var words = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "N";
    return words.slice(0, 2).map(function (word) { return word.charAt(0); }).join("").toUpperCase();
  }

  /* ---------- Settings form ---------- */

  function populateSettingsForm() {
    if (!els.settingsForm) return;
    var settings = store.getSettings();
    Object.keys(settings).forEach(function (key) {
      var field = els.settingsForm.elements.namedItem(key);
      if (field) field.value = settings[key] || "";
    });
    var status = document.getElementById("settingsStatus");
    if (status) status.textContent = "Editing content stored in this browser.";
  }

  function collectSettings() {
    var values = {};
    Array.prototype.forEach.call(els.settingsForm.elements, function (field) {
      if (!field.name) return;
      if (field.type === "checkbox" || field.type === "radio" || field.type === "file") return;
      values[field.name] = String(field.value || "").trim();
    });
    return values;
  }

  function validateSettings(values) {
    if (!values.brandName) return { field: "brandName", message: "The brand name can’t be empty." };
    if (!values.siteTitle) return { field: "siteTitle", message: "The browser title can’t be empty." };
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      return { field: "email", message: "That email address doesn’t look right." };
    }
    var urlFields = ["instagram", "linkedin", "x"];
    for (var i = 0; i < urlFields.length; i += 1) {
      var field = urlFields[i];
      if (values[field] && !/^https?:\/\//i.test(values[field])) {
        return { field: field, message: "Social links need a full address starting with http:// or https://." };
      }
    }
    return null;
  }

  function saveSettings(event) {
    event.preventDefault();
    if (!els.settingsForm) return;

    var values = collectSettings();
    var error = validateSettings(values);
    var status = document.getElementById("settingsStatus");

    if (error) {
      if (status) status.textContent = error.message;
      toast(error.message, true);
      var field = els.settingsForm.elements.namedItem(error.field);
      if (field) field.focus();
      return;
    }

    values.instagram = normalizeUrl(values.instagram);
    values.linkedin = normalizeUrl(values.linkedin);
    values.x = normalizeUrl(values.x);
    ["instagram", "linkedin", "x"].forEach(function (key) {
      var field = els.settingsForm.elements.namedItem(key);
      if (field) field.value = values[key];
    });

    try {
      store.saveSettings(values);
    } catch (saveError) {
      if (status) status.textContent = saveError.message;
      toast(saveError.message, true);
      return;
    }

    if (window.NUVApp) window.NUVApp.refresh();
    if (status) status.textContent = "Saved just now — your site is updated.";
    toast("Site settings saved.");
    setAdminTitle();
    window.setTimeout(function () {
      if (status) status.textContent = "Editing content stored in this browser.";
    }, 4000);
  }

  function resetContent() {
    confirmAction({
      title: "Reset demo content?",
      text: "This restores the original nine projects and all default copy, removing every edit made in this browser.",
      confirmLabel: "Reset content"
    }).then(function (confirmed) {
      if (!confirmed) return;
      try {
        store.resetAll();
      } catch (error) {
        toast(error.message, true);
        return;
      }
      populateSettingsForm();
      renderAdminProjects();
      if (window.NUVApp) window.NUVApp.refresh();
      toast("Demo content restored.");
    });
  }

  /* ---------- Project editor ---------- */

  function setPreview(url) {
    if (!els.preview || !els.previewImg) return;
    var value = String(url || "").trim();
    if (!value) {
      els.preview.classList.remove("has-image");
      els.previewImg.removeAttribute("src");
      return;
    }
    els.preview.classList.add("has-image");
    els.previewImg.onerror = function () {
      els.preview.classList.remove("has-image");
      els.previewImg.removeAttribute("src");
    };
    els.previewImg.src = value;
  }

  function openEditor(project) {
    if (!els.editorDialog || !els.projectForm) return;
    state.editingId = project ? project.id : null;
    els.projectForm.reset();
    var errorEl = document.getElementById("projectFormError");
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }

    var title = project ? "Edit project" : "Add project";
    var heading = document.getElementById("editorTitle");
    if (heading) heading.textContent = title;

    els.projectForm.elements.namedItem("id").value = project ? project.id : "";
    els.projectForm.elements.namedItem("title").value = project ? project.title : "";
    els.projectForm.elements.namedItem("category").value = project ? project.category : "web";
    els.projectForm.elements.namedItem("description").value = project ? project.description : "";
    els.projectForm.elements.namedItem("image").value = project ? project.image : "";
    els.projectForm.elements.namedItem("link").value = project ? project.link : "";
    els.projectForm.elements.namedItem("year").value = project ? project.year : new Date().getFullYear();
    els.projectForm.elements.namedItem("result").value = project ? project.result || "" : "";
    els.projectForm.elements.namedItem("resultNote").value = project ? project.resultNote || "" : "";
    els.projectForm.elements.namedItem("tags").value =
      project && Array.isArray(project.tags) ? project.tags.join(", ") : "";

    setPreview(project ? project.image : "");

    els.editorDialog.showModal();
    window.setTimeout(function () {
      var titleField = els.projectForm.elements.namedItem("title");
      if (titleField) titleField.focus();
    }, 40);
  }

  function closeEditor() {
    if (els.editorDialog && els.editorDialog.open) els.editorDialog.close();
  }

  function submitProject(event) {
    event.preventDefault();
    if (!els.projectForm) return;

    var form = els.projectForm;
    var errorEl = document.getElementById("projectFormError");
    var values = {
      title: String(form.elements.namedItem("title").value || "").trim(),
      category: String(form.elements.namedItem("category").value || "web"),
      description: String(form.elements.namedItem("description").value || "").trim(),
      image: normalizeImage(form.elements.namedItem("image").value),
      link: normalizeUrl(form.elements.namedItem("link").value),
      year: Number(form.elements.namedItem("year").value) || undefined,
      result: String(form.elements.namedItem("result").value || "").trim(),
      resultNote: String(form.elements.namedItem("resultNote").value || "").trim(),
      tags: String(form.elements.namedItem("tags").value || "")
    };

    function showError(message) {
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
      toast(message, true);
    }

    if (!values.title) {
      showError("Give the project a title first.");
      form.elements.namedItem("title").focus();
      return;
    }
    if (!store.CATEGORIES.some(function (category) { return category.id === values.category; })) {
      showError("Choose a valid category.");
      return;
    }

    try {
      if (state.editingId) {
        store.updateProject(state.editingId, values);
        toast("Project updated.");
      } else {
        store.addProject(values);
        if (window.NUVApp && typeof window.NUVApp.setFilter === "function") {
          window.NUVApp.setFilter("all");
        }
        toast("Project added to the portfolio.");
      }
    } catch (error) {
      showError(error.message);
      return;
    }

    closeEditor();
    renderAdminProjects();
    if (window.NUVApp) window.NUVApp.refresh();
  }

  function handleFile(file) {
    if (!file) return;
    if (!/^image\//i.test(file.type)) {
      toast("Please choose an image file.", true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("That image is over 8 MB. Try a smaller file or paste a URL.", true);
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var image = new Image();
      image.onload = function () {
        var max = 1400;
        var scale = Math.min(1, max / Math.max(image.width, image.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        var context = canvas.getContext("2d");
        context.fillStyle = "#e5e5e0";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        var dataUrl;
        try {
          dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        } catch (error) {
          toast("This image could not be processed in the browser.", true);
          return;
        }

        var imageField = els.projectForm.elements.namedItem("image");
        imageField.value = dataUrl;
        setPreview(dataUrl);
        var sizeKb = Math.round((dataUrl.length * 0.75) / 1024);
        toast("Image added — resized to 1400px, about " + sizeKb + " KB.");
      };
      image.onerror = function () {
        toast("That file could not be read as an image.", true);
      };
      image.src = reader.result;
    };
    reader.onerror = function () {
      toast("The file could not be read.", true);
    };
    reader.readAsDataURL(file);
  }

  /* ---------- Confirm ---------- */

  function confirmAction(options) {
    return new Promise(function (resolve) {
      if (!els.confirmDialog) {
        resolve(window.confirm(options.text));
        return;
      }

      document.getElementById("confirmTitle").textContent = options.title || "Are you sure?";
      document.getElementById("confirmText").textContent = options.text || "";
      els.confirmOk.textContent = options.confirmLabel || "Confirm";
      els.confirmCancel.textContent = options.cancelLabel || "Cancel";

      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        els.confirmOk.onclick = null;
        els.confirmCancel.onclick = null;
        els.confirmDialog.onclose = null;
        els.confirmDialog.close();
        resolve(value);
      }

      els.confirmOk.onclick = function () { finish(true); };
      els.confirmCancel.onclick = function () { finish(false); };
      els.confirmDialog.onclose = function () {
        // A close event queued by an earlier confirmation can land after this one
        // has already opened; only read it as a cancel when the dialog is shut.
        if (els.confirmDialog.open) return;
        finish(false);
      };

      if (els.confirmDialog.open) els.confirmDialog.close();
      els.confirmDialog.showModal();
      window.setTimeout(function () { els.confirmCancel.focus(); }, 30);
    });
  }

  function deleteProject(id) {
    var project = store.getProjects().find(function (item) { return item.id === id; });
    if (!project) return;

    confirmAction({
      title: "Delete “" + project.title + "”?",
      text: "This removes the project from the public portfolio. It can’t be undone.",
      confirmLabel: "Delete project"
    }).then(function (confirmed) {
      if (!confirmed) return;
      try {
        store.deleteProject(id);
      } catch (error) {
        toast(error.message, true);
        return;
      }
      renderAdminProjects();
      if (window.NUVApp) window.NUVApp.refresh();
      toast("Project deleted.");
    });
  }

  /* ---------- Open / close ---------- */

  function openAdmin() {
    if (state.open) return;
    state.open = true;
    state.lastFocus = document.activeElement;

    populateSettingsForm();
    renderAdminProjects();
    switchTab(state.tab);

    els.admin.hidden = false;
    document.body.classList.add("admin-open");
    var site = document.getElementById("site");
    if (site) site.inert = true;

    setAdminTitle();

    window.setTimeout(function () {
      var activeTab = els.admin.querySelector(".admin-tab.is-active");
      if (activeTab) activeTab.focus();
    }, 30);
  }

  function closeAdmin() {
    if (!state.open) return;
    state.open = false;

    closeEditor();
    if (els.confirmDialog && els.confirmDialog.open) els.confirmDialog.close();

    els.admin.hidden = true;
    document.body.classList.remove("admin-open");
    var site = document.getElementById("site");
    if (site) site.inert = false;

    document.title = store.getSettings().siteTitle || "NUV";

    if (isAdminHash()) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    if (state.lastFocus && typeof state.lastFocus.focus === "function") {
      try { state.lastFocus.focus({ preventScroll: true }); } catch (error) { /* element may be gone */ }
    }
  }

  function exitToSite() {
    closeAdmin();
    document.body.classList.remove("admin-open");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function syncRoute() {
    if (isAdminHash()) {
      openAdmin();
    } else {
      closeAdmin();
    }
  }

  /* ---------- Setup ---------- */

  function cacheElements() {
    els.admin = document.getElementById("admin");
    els.projectList = document.getElementById("adminProjectList");
    els.settingsForm = document.getElementById("settingsForm");
    els.editorDialog = document.getElementById("editorDialog");
    els.projectForm = document.getElementById("projectForm");
    els.confirmDialog = document.getElementById("confirmDialog");
    els.confirmOk = document.getElementById("confirmOk");
    els.confirmCancel = document.getElementById("confirmCancel");
    els.preview = document.getElementById("imagePreview");
    els.previewImg = document.getElementById("imagePreviewImg");
  }

  function bindEvents() {
    if (!els.admin) return;

    document.querySelectorAll("[data-admin-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        switchTab(button.getAttribute("data-admin-tab"));
      });
    });

    var exit = document.getElementById("adminExit");
    if (exit) exit.addEventListener("click", exitToSite);

    var viewSite = document.getElementById("adminViewSite");
    if (viewSite) {
      viewSite.addEventListener("click", function () {
        closeAdmin();
        window.scrollTo({ top: 0, behavior: "auto" });
      });
    }

    var add = document.getElementById("addProjectBtn");
    if (add) add.addEventListener("click", function () { openEditor(null); });

    if (els.projectList) {
      els.projectList.addEventListener("click", function (event) {
        var editButton = event.target.closest("[data-edit-project]");
        if (editButton) {
          var project = store.getProjects().find(function (item) {
            return item.id === editButton.getAttribute("data-edit-project");
          });
          if (project) openEditor(project);
          return;
        }
        var deleteButton = event.target.closest("[data-delete-project]");
        if (deleteButton) deleteProject(deleteButton.getAttribute("data-delete-project"));
      });
    }

    if (els.settingsForm) {
      els.settingsForm.addEventListener("submit", saveSettings);
    }

    var reset = document.getElementById("resetBtn");
    if (reset) reset.addEventListener("click", resetContent);

    if (els.projectForm) {
      els.projectForm.addEventListener("submit", submitProject);
    }

    if (els.editorDialog) {
      document.querySelectorAll("[data-close-editor]").forEach(function (button) {
        button.addEventListener("click", closeEditor);
      });
      els.editorDialog.addEventListener("close", function () {
        if (els.editorDialog.open) return;
        state.editingId = null;
      });
    }

    var imageField = document.getElementById("imageUrlInput");
    if (imageField) {
      imageField.addEventListener("input", function () { setPreview(imageField.value); });
    }

    var uploadButton = document.getElementById("uploadImageBtn");
    var fileInput = document.getElementById("imageFileInput");
    if (uploadButton && fileInput) {
      uploadButton.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function () {
        handleFile(fileInput.files && fileInput.files[0]);
        fileInput.value = "";
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!state.open) return;
      if (event.key === "Escape") {
        if ((els.editorDialog && els.editorDialog.open) || (els.confirmDialog && els.confirmDialog.open)) return;
        closeAdmin();
      }
    });

    els.admin.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") return;
      if ((els.editorDialog && els.editorDialog.open) || (els.confirmDialog && els.confirmDialog.open)) return;
      var focusable = Array.prototype.filter.call(
        els.admin.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null && !el.closest("[hidden]"); }
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("hashchange", syncRoute);
  }

  function init() {
    cacheElements();
    if (!els.admin) return;
    bindEvents();
    syncRoute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
