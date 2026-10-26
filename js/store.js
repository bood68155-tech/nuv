/*
 * NUV content store.
 * A tiny persistence layer over localStorage. No build step, no dependencies.
 * All writes throw if the browser cannot persist the data (private mode, quota).
 */
(function () {
  "use strict";

  var KEYS = {
    settings: "nuv.settings.v1",
    projects: "nuv.projects.v1"
  };

  var CATEGORIES = [
    { id: "web", label: "Web" },
    { id: "stores", label: "Stores" },
    { id: "designs", label: "Designs" }
  ];

  function defaults() {
    return window.NUV_DEFAULTS || { settings: {}, projects: [] };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJSON(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
        throw new Error("Browser storage is full. Use an image URL instead of an uploaded file, or delete an older project.");
      }
      throw new Error("This browser blocked local storage, so changes could not be saved.");
    }
  }

  function categoryLabel(id) {
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i].label;
    }
    return "Web";
  }

  function getSettings() {
    var base = clone(defaults().settings);
    var stored = readJSON(KEYS.settings);
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      Object.keys(stored).forEach(function (key) {
        if (typeof stored[key] === "string") base[key] = stored[key];
      });
    }
    return base;
  }

  function saveSettings(patch) {
    var next = getSettings();
    Object.keys(patch || {}).forEach(function (key) {
      if (typeof patch[key] === "string") next[key] = patch[key];
    });
    writeJSON(KEYS.settings, next);
    return next;
  }

  function normalizeProject(raw) {
    if (!raw || typeof raw !== "object") return null;
    var title = String(raw.title || "").trim();
    if (!title) return null;
    var category = CATEGORIES.some(function (c) { return c.id === raw.category; })
      ? raw.category
      : "web";
    var tags = Array.isArray(raw.tags)
      ? raw.tags.filter(function (tag) { return typeof tag === "string" && tag.trim(); }).slice(0, 6)
      : [categoryLabel(category)];
    return {
      id: String(raw.id || "project-" + Date.now().toString(36)),
      title: title.slice(0, 90),
      category: category,
      description: String(raw.description || "").trim().slice(0, 600),
      image: String(raw.image || "").trim(),
      link: String(raw.link || "").trim(),
      year: Number(raw.year) || new Date().getFullYear(),
      tags: tags,
      createdAt: raw.createdAt || new Date().toISOString()
    };
  }

  function getProjects() {
    var stored = readJSON(KEYS.projects);
    if (Array.isArray(stored)) {
      return stored.map(normalizeProject).filter(Boolean);
    }
    return clone(defaults().projects);
  }

  function saveProjects(projects) {
    var clean = (Array.isArray(projects) ? projects : []).map(normalizeProject).filter(Boolean);
    writeJSON(KEYS.projects, clean);
    return clean;
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "project-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function addProject(input) {
    var title = String((input && input.title) || "").trim();
    if (!title) throw new Error("A project title is required.");

    var projects = getProjects();
    var project = normalizeProject({
      id: makeId(),
      title: title,
      category: input.category,
      description: input.description,
      image: input.image,
      link: input.link,
      year: new Date().getFullYear(),
      tags: [categoryLabel(input.category)],
      createdAt: new Date().toISOString()
    });
    projects.unshift(project);
    saveProjects(projects);
    return project;
  }

  function updateProject(id, input) {
    var projects = getProjects();
    var index = projects.findIndex(function (project) { return project.id === id; });
    if (index === -1) throw new Error("That project no longer exists.");

    var current = projects[index];
    var title = String((input && input.title) || "").trim();
    if (!title) throw new Error("A project title is required.");

    var next = normalizeProject({
      id: current.id,
      title: title,
      category: input.category || current.category,
      description: input.description,
      image: input.image,
      link: input.link,
      year: current.year,
      tags: current.tags,
      createdAt: current.createdAt
    });
    projects[index] = next;
    saveProjects(projects);
    return next;
  }

  function deleteProject(id) {
    var projects = getProjects().filter(function (project) { return project.id !== id; });
    saveProjects(projects);
    return projects;
  }

  function resetAll() {
    try {
      window.localStorage.removeItem(KEYS.settings);
      window.localStorage.removeItem(KEYS.projects);
    } catch (error) {
      throw new Error("This browser blocked local storage, so the content could not be reset.");
    }
  }

  function hasCustomContent() {
    try {
      return Boolean(window.localStorage.getItem(KEYS.settings) || window.localStorage.getItem(KEYS.projects));
    } catch (error) {
      return false;
    }
  }

  window.NUVStore = {
    KEYS: KEYS,
    CATEGORIES: CATEGORIES,
    categoryLabel: categoryLabel,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getProjects: getProjects,
    saveProjects: saveProjects,
    addProject: addProject,
    updateProject: updateProject,
    deleteProject: deleteProject,
    resetAll: resetAll,
    hasCustomContent: hasCustomContent
  };
})();
