/*
 * NUV Dental — contact form.
 * Client-side validation plus the same success/error states as the reference
 * clinic site. This is a static deployment with no form endpoint, so a valid
 * submission shows the confirmation rather than posting anywhere.
 */
(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  if (!form) return;

  var status = document.getElementById("contactStatus");
  var done = document.getElementById("contactDone");
  var submit = form.querySelector('button[type="submit"]');

  function fieldOf(input) {
    return input ? input.closest(".field") : null;
  }

  function setStatus(message, isError) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", !!isError);
    status.hidden = false;
  }

  function clearErrors() {
    Array.prototype.forEach.call(form.querySelectorAll(".field.has-error"), function (field) {
      field.classList.remove("has-error");
    });
    if (status) status.hidden = true;
  }

  function validate() {
    var firstBad = null;

    ["name", "email", "message"].forEach(function (name) {
      var input = form.elements.namedItem(name);
      if (!input) return;

      var value = String(input.value || "").trim();
      var bad = !value;

      if (name === "email" && value) {
        bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }

      fieldOf(input).classList.toggle("has-error", bad);
      if (bad && !firstBad) firstBad = input;
    });

    return firstBad;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearErrors();

    var bad = validate();
    if (bad) {
      setStatus("Please check the highlighted fields and try again.", true);
      bad.focus();
      return;
    }

    if (submit) submit.disabled = true;
    setStatus("Sending your message…", false);

    // No endpoint on a static deploy — confirm locally.
    window.setTimeout(function () {
      form.hidden = true;
      if (done) {
        done.hidden = false;
        var heading = done.querySelector("h3");
        if (heading) heading.setAttribute("tabindex", "-1");
        if (heading) heading.focus();
      }
    }, 450);
  });

  Array.prototype.forEach.call(form.querySelectorAll("input, textarea, select"), function (input) {
    input.addEventListener("input", function () {
      var field = fieldOf(input);
      if (field) field.classList.remove("has-error");
    });
  });
})();
