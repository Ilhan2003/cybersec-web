// Adds background layer + optional auto-glitch text from headings.
(function () {
  // Background spark layer
  if (!document.querySelector(".hx-bg")) {
    const bg = document.createElement("div");
    bg.className = "hx-bg";
    document.body.appendChild(bg);
  }

  // Auto-apply data-text on elements marked hx-glitch but missing it
  document.querySelectorAll(".hx-glitch").forEach(el => {
    if (!el.getAttribute("data-text")) el.setAttribute("data-text", el.textContent.trim());
  });
})();
