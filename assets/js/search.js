/* ==========================================================================
   V0XRYN — Lightweight Client-Side Search
   Searches across blog posts and project cards (public + private).
   No dependencies.
   ========================================================================== */

(function () {
  "use strict";

  const SEARCH_INPUT = document.getElementById("blog-search");
  const SEARCH_RESET = document.getElementById("blog-search-reset");
  const BLOG_GRID = document.getElementById("blog-grid");
  const PUBLIC_GRID = document.getElementById("projects-grid");
  const PRIVATE_GRID = document.getElementById("private-projects-grid");
  const BLOG_NOTE = document.getElementById("blog-note");

  if (!SEARCH_INPUT) return;

  let searchTimeout = null;
  let originalBlogHTML = "";
  let originalPublicHTML = "";
  let originalPrivateHTML = "";

  // Capture original HTML before any filtering
  function captureOriginals() {
    if (BLOG_GRID && BLOG_GRID.children.length > 0 && !originalBlogHTML) {
      originalBlogHTML = BLOG_GRID.innerHTML;
    }
    if (PUBLIC_GRID && PUBLIC_GRID.children.length > 0 && !originalPublicHTML) {
      originalPublicHTML = PUBLIC_GRID.innerHTML;
    }
    if (PRIVATE_GRID && PRIVATE_GRID.children.length > 0 && !originalPrivateHTML) {
      originalPrivateHTML = PRIVATE_GRID.innerHTML;
    }
  }

  function restoreOriginals() {
    if (BLOG_GRID && originalBlogHTML) {
      BLOG_GRID.innerHTML = originalBlogHTML;
    }
    if (PUBLIC_GRID && originalPublicHTML) {
      PUBLIC_GRID.innerHTML = originalPublicHTML;
    }
    if (PRIVATE_GRID && originalPrivateHTML) {
      PRIVATE_GRID.innerHTML = originalPrivateHTML;
    }
    if (BLOG_NOTE) BLOG_NOTE.style.display = "block";
    // Re-trigger reveal animations on restored content
    requestAnimationFrame(() => {
      document.querySelectorAll(".reveal:not(.visible)").forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 100);
      });
    });
  }

  function filterByQuery(query) {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
    if (terms.length === 0) {
      restoreOriginals();
      return;
    }

    captureOriginals();

    // Filter blog cards
    if (BLOG_GRID) {
      const blogCards = BLOG_GRID.querySelectorAll(".blog-card");
      let visibleBlogCount = 0;
      blogCards.forEach((card) => {
        const text = card.textContent.toLowerCase();
        const match = terms.every((term) => text.includes(term));
        card.style.display = match ? "" : "none";
        if (match) visibleBlogCount++;
      });

      if (BLOG_NOTE) {
        if (visibleBlogCount === 0) {
          BLOG_NOTE.textContent = "No articles match your search.";
          BLOG_NOTE.style.display = "block";
          BLOG_NOTE.style.color = "var(--text-dim)";
        } else if (query.trim()) {
          BLOG_NOTE.textContent = `${visibleBlogCount} article${visibleBlogCount !== 1 ? "s" : ""} match your search.`;
          BLOG_NOTE.style.display = "block";
          BLOG_NOTE.style.color = "var(--text-dim)";
        } else {
          BLOG_NOTE.style.display = "block";
        }
      }
    }

    // Filter public project cards
    if (PUBLIC_GRID) {
      const projectCards = PUBLIC_GRID.querySelectorAll(".project-card[data-scope='public']");
      let visibleProjectCount = 0;
      projectCards.forEach((card) => {
        const text = card.textContent.toLowerCase();
        const match = terms.every((term) => text.includes(term));
        card.style.display = match ? "" : "none";
        if (match) visibleProjectCount++;
      });
    }

    // Filter private project cards
    if (PRIVATE_GRID) {
      const projectCards = PRIVATE_GRID.querySelectorAll(".project-card[data-scope='private']");
      let visibleProjectCount = 0;
      projectCards.forEach((card) => {
        const text = card.textContent.toLowerCase();
        const match = terms.every((term) => text.includes(term));
        card.style.display = match ? "" : "none";
        if (match) visibleProjectCount++;
      });
    }
  }

  SEARCH_INPUT.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterByQuery(SEARCH_INPUT.value);
      if (SEARCH_RESET) {
        SEARCH_RESET.style.display = SEARCH_INPUT.value ? "inline-block" : "none";
      }
    }, 150);
  });

  if (SEARCH_RESET) {
    SEARCH_RESET.addEventListener("click", () => {
      SEARCH_INPUT.value = "";
      SEARCH_RESET.style.display = "none";
      restoreOriginals();
      SEARCH_INPUT.focus();
    });
  }

  // Expose a function that other scripts can call to refresh search index
  window.V0XRYNSearch = {
    refresh: captureOriginals,
    reset: restoreOriginals
  };

  // Periodically capture originals as content loads asynchronously
  setInterval(captureOriginals, 1000);
})();