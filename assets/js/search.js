/* ==========================================================================
   V0XRYN — Lightweight Client-Side Search
   Searches across blog posts and project cards. No dependencies.
   ========================================================================== */

(function () {
  "use strict";

  const SEARCH_INPUT = document.getElementById("blog-search");
  const SEARCH_RESET = document.getElementById("blog-search-reset");
  const BLOG_GRID = document.getElementById("blog-grid");
  const PROJECTS_GRID = document.getElementById("projects-grid");
  const BLOG_NOTE = document.getElementById("blog-note");

  if (!SEARCH_INPUT) return;

  let searchTimeout = null;
  let originalBlogHTML = "";
  let originalProjectsHTML = "";

  // Capture original HTML before any filtering
  function captureOriginals() {
    if (BLOG_GRID && BLOG_GRID.children.length > 0 && !originalBlogHTML) {
      originalBlogHTML = BLOG_GRID.innerHTML;
    }
    if (PROJECTS_GRID && PROJECTS_GRID.children.length > 0 && !originalProjectsHTML) {
      originalProjectsHTML = PROJECTS_GRID.innerHTML;
    }
  }

  function restoreOriginals() {
    if (BLOG_GRID && originalBlogHTML) {
      BLOG_GRID.innerHTML = originalBlogHTML;
    }
    if (PROJECTS_GRID && originalProjectsHTML) {
      PROJECTS_GRID.innerHTML = originalProjectsHTML;
    }
    if (BLOG_NOTE) BLOG_NOTE.style.display = "block";
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

    // Filter project cards
    if (PROJECTS_GRID) {
      const projectCards = PROJECTS_GRID.querySelectorAll(".project-card");
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

  // Re-capture originals when new content is injected (projects/blog render)
  const originalRenderProjects = window.renderProjects;
  const originalRenderBlog = window.renderBlog;

  // Expose a function that other scripts can call to refresh search index
  window.V0XRYNSearch = {
    refresh: captureOriginals,
    reset: restoreOriginals
  };

  // Periodically capture originals as content loads asynchronously
  setInterval(captureOriginals, 1000);
})();
