/* ==========================================================================
   V0XRYN — Projects
   Fetches real public projects from GitHub. Falls back to a local list if
   the API is unreachable. Designed so new projects appear automatically.
   ========================================================================== */

(function () {
  "use strict";

  const GITHUB_USER = "V0XRYN";
  const PROJECTS_LIMIT = 6;
  const GRID = document.getElementById("projects-grid");
  const NOTE = document.getElementById("projects-note");
  const FILTER_BTNS = document.querySelectorAll(".filter-btn");

  // Repos we deliberately exclude (non-project / TOS-blocked / profile config)
  const EXCLUDED = new Set([
    "V0XRYN.github.io",
    "oussamapunisher",
    "ABHISHEK-SER",
    "Anya_v2-MD",
    "MIDDLE_STAR",
    "Ngk.rdp",
    "VAJIRA-MD-NEW",
    "whatsapp-bot-md"
  ]);

  // Local fallback so the section is never empty
  const FALLBACK = [
    {
      name: "V0XRYN Digital Brand",
      description: "This personal brand website — technology, Linux, AI, cybersecurity and creation.",
      language: "HTML",
      html_url: "https://github.com/V0XRYN/V0XRYN.github.io",
      updated_at: new Date().toISOString(),
      topics: ["web", "brand", "portfolio"]
    }
  ];

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function categoryFor(repo) {
    const topics = (repo.topics || []).map((t) => t.toLowerCase());
    const name = repo.name.toLowerCase();
    const desc = (repo.description || "").toLowerCase();
    const all = topics.concat(name, desc).join(" ");
    if (all.includes("linux") || all.includes("arch") || all.includes("dotfiles")) return "linux";
    if (all.includes("ai") || all.includes("agent") || all.includes("llm") || all.includes("automation")) return "ai";
    if (all.includes("secur") || all.includes("red") || all.includes("exploit") || all.includes("hack")) return "security";
    if (all.includes("web") || all.includes("site") || all.includes("app") || all.includes("javascript")) return "web";
    return "all";
  }

  function renderCard(repo) {
    const cat = categoryFor(repo);
    const lang = repo.language || "Code";
    const desc = escapeHtml(repo.description || "No description available.");
    const name = escapeHtml(repo.name);
    const tags = (repo.topics || []).slice(0, 3);

    return `
      <article class="project-card reveal" data-category="${cat}">
        <div class="project-preview" aria-hidden="true"></div>
        <div class="project-content">
          <span class="project-category">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</span>
          <h3 class="project-title">${name}</h3>
          <p class="project-desc">${desc}</p>
          <div class="project-footer">
            <div class="project-tags">
              ${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
              ${lang ? `<span>${escapeHtml(lang)}</span>` : ""}
            </div>
            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="project-link">
              View on GitHub <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function renderProjects(projects) {
    if (!GRID || !NOTE) return;
    NOTE.style.display = "none";
    GRID.innerHTML = projects.map(renderCard).join("");
    // Trigger reveal animation
    requestAnimationFrame(() => {
      document.querySelectorAll(".project-card.reveal").forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 100);
      });
    });
    setupFilters();
  }

  function setupFilters() {
    FILTER_BTNS.forEach((btn) => {
      btn.addEventListener("click", () => {
        FILTER_BTNS.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.dataset.filter;
        document.querySelectorAll(".project-card").forEach((card) => {
          const cat = card.dataset.category;
          if (filter === "all" || cat === filter) {
            card.style.display = "";
            card.classList.add("reveal");
            requestAnimationFrame(() => card.classList.add("visible"));
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  async function fetchProjects() {
    if (!GRID || !NOTE) return;
    try {
      const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`,
        { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error("GitHub API responded " + res.status);
      const repos = await res.json();
      const projects = repos
        .filter((r) => !r.fork) // exclude forked repos entirely
        .filter((r) => r.owner?.login === GITHUB_USER) // only repos owned by V0XRYN
        .filter((r) => !EXCLUDED.has(r.name))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, PROJECTS_LIMIT);
      renderProjects(projects.length ? projects : FALLBACK);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      renderProjects(FALLBACK);
      NOTE.textContent = "Showing featured projects.";
      NOTE.style.display = "block";
      NOTE.style.color = "var(--text-dim)";
    }
  }

  fetchProjects();
})();
