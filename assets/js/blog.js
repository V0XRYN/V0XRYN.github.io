/* ==========================================================================
   V0XRYN — Blog / Journey content + rendering
   Local, maintainable content structure. Renders posts into the DOM.
   ========================================================================== */

const BLOG_POSTS = [
  {
    id: "welcome-to-v0xryn",
    title: "Welcome to V0XRYN",
    category: "Journal",
    description: "Introducing the V0XRYN digital brand — a space for technology, Linux, AI, cybersecurity and creation.",
    date: "2026-11-27",
    readTime: "2 min read",
    url: "blog/welcome-to-v0xryn.html"
  },
  {
    id: "arch-linux-customization",
    title: "Arch Linux: Building a Minimal Workstation",
    category: "Linux",
    description: "Notes on customizing Arch Linux from the ground up — window manager, dotfiles, and system tuning.",
    date: "2026-11-20",
    readTime: "6 min read",
    url: "blog/arch-linux-customization.html"
  },
  {
    id: "local-ai-agents",
    title: "Running Local AI Agents with Ollama",
    category: "AI",
    description: "Exploring local-first AI agents, tool use, and automation without relying on cloud APIs.",
    date: "2026-11-14",
    readTime: "5 min read",
    url: "blog/local-ai-agents.html"
  },
  {
    id: "security-lab-notes",
    title: "Cybersecurity Lab Setup",
    category: "Security",
    description: "A practical look at building a controlled environment for Red Team learning and tool experimentation.",
    date: "2026-11-08",
    readTime: "7 min read",
    url: "blog/security-lab-notes.html"
  },
  {
    id: "open-source-contribution",
    title: "First Open-Source Contribution",
    category: "Projects",
    description: "Lessons learned from contributing to an open-source project — from issue triage to merged PR.",
    date: "2026-10-31",
    readTime: "4 min read",
    url: "blog/open-source-contribution.html"
  }
];

(function () {
  "use strict";

  const GRID = document.getElementById("blog-grid");
  const NOTE = document.getElementById("blog-note");

  if (!GRID || !NOTE) return;

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function renderCard(post) {
    return `
      <article class="blog-card reveal">
        <div class="blog-preview" aria-hidden="true"></div>
        <div class="blog-content">
          <span class="blog-category">${escapeHtml(post.category)}</span>
          <h3 class="blog-title">${escapeHtml(post.title)}</h3>
          <p style="margin:0;color:var(--text-muted);font-size:0.88rem;line-height:1.6;">${escapeHtml(post.description)}</p>
          <div class="blog-meta">
            <span>${formatDate(post.date)}</span>
            <span>${post.readTime}</span>
          </div>
        </div>
        <a href="${escapeHtml(post.url)}" style="display:block;text-decoration:none;color:inherit;">
          Read article
        </a>
      </article>
    `;
  }

  function renderPosts(posts) {
    GRID.innerHTML = posts.map(renderCard).join("");
    requestAnimationFrame(() => {
      document.querySelectorAll(".blog-card.reveal").forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 100);
      });
    });
    if (NOTE) {
      NOTE.style.display = "none";
    }
    // Signal search to refresh its original HTML capture
    if (window.V0XRYNSearch) {
      window.V0XRYNSearch.refresh();
    }
  }

  renderPosts(BLOG_POSTS);
})();
