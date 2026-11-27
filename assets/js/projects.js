/* ==========================================================================
   V0XRYN — Projects
   Fetches real public projects from GitHub. Falls back to a local list if
   the API is unreachable. Supports manual featured/pinned projects via
   window.V0XRYN_FEATURED array.
   ========================================================================== */

(function () {
  "use strict";

  const GITHUB_USER = "V0XRYN";
  const PROJECTS_LIMIT = 6;
  const GRID = document.getElementById("projects-grid");
  const LOADING = document.getElementById("projects-loading");
  const ERROR = document.getElementById("projects-error");
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

  // Manual featured projects — add repo names here to pin them regardless of recency
  const FEATURED = (window.V0XRYN_FEATURED || []).slice();

  // GitHub linguistics language colors (concise, commonly used)
  const LANGUAGE_COLORS = {
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    C: "#555555",
    "C++": "#f34b7d",
    "C#": "#178600",
    Java: "#b07219",
    TypeScript: "#2b7489",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Shell: "#89e051",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Lua: "#000080",
    Dart: "#0075EC",
    Kotlin: "#F18E33",
    Swift: "#FFAC45",
    Powershell: "#012456",
    Dockerfile: "#384d54",
    Jupyter: "#DA3B17",
    JSON: "#292929",
    YAML: "#cb171e",
    Markdown: "#083fa1",
    Nix: "#7ef5ff",
    Vim: "#019833",
    TeX: "#3D6117",
    Makefile: "#427819",
    Assembly: "#6E4C13",
    Perl: "#0298c3",
    R: "#198CE7",
    Scala: "#C22D40",
    Elixir: "#4e2a8c",
    Clojure: "#db5855",
    Haskell: "#5e5086",
    OCaml: "#3be133",
    Erlang: "#B83998",
    Julia: "#a270ba",
    Vue: "#41b883",
    React: "#61dafb",
    Svelte: "#ff3e00",
    Tailwind: "#06b6d4",
    Sass: "#cc6699",
    Less: "#1d365d",
    Angular: "#b00e32",
    jQuery: "#888898",
    Bootstrap: "#7952b3",
    Astro: "#ff5d01",
    Deno: "#000000",
    Bun: "#000000",
    Zig: "#f7a01b",
    Nim: "#377b6b",
    FSharp: "#378BBA",
    Elm: "#60B5CC",
    Nushell: "#2e8b57",
    SQL: "#2e8b57",
    PLpgSQL: "#146085",
    TSQL: "#2471a5",
    Docker: "#2e8b57",
    Kubernetes: "#2e8b57",
    Terraform: "#2e8b57",
    Ansible: "#2e8b57",
    Nginx: "#009639",
    Apache: "#2e8b57",
    Ethereum: "#2e8b57",
    Bitcoin: "#f7931a",
    Solana: "#2e8b57",
  };

  // Local fallback so the section is never empty
  const FALLBACK = [
    {
      name: "V0XRYN Digital Brand",
      description: "This personal brand website — technology, Linux, AI, cybersecurity and creation.",
      language: "HTML",
      html_url: "https://github.com/V0XRYN/V0XRYN.github.io",
      stargazers_count: 0,
      updated_at: new Date().toISOString(),
      topics: ["web", "brand", "portfolio"],
      forks_count: 0,
      open_issues_count: 0
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

  function relativeDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
    return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
  }

  function languageColor(language) {
    return LANGUAGE_COLORS[language] || "#8B97A8";
  }

  function renderCard(repo) {
    const cat = categoryFor(repo);
    const lang = repo.language || "Code";
    const desc = escapeHtml(repo.description || "No description available.");
    const name = escapeHtml(repo.name);
    const stars = repo.stargazers_count || 0;
    const updated = repo.updated_at ? relativeDate(repo.updated_at) : "";
    const tags = (repo.topics || []).slice(0, 3);
    const langColor = languageColor(lang);

    return `
      <article class="project-card reveal" data-category="${cat}">
        <div class="project-preview" aria-hidden="true"></div>
        <div class="project-content">
          <div class="project-header">
            <span class="project-category">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</span>
            <span class="project-language" style="color:${langColor}">● ${escapeHtml(lang)}</span>
          </div>
          <h3 class="project-title">${name}</h3>
          <p class="project-desc">${desc}</p>
          <div class="project-footer">
            <div class="project-meta">
              <span title="Stars">${stars}</span>
              ${updated ? `<span title="Last updated">${updated}</span>` : ""}
            </div>
            <div class="project-tags">
              ${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
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
    if (LOADING) LOADING.style.display = "none";
    if (ERROR) ERROR.style.display = "none";
    GRID.innerHTML = projects.map(renderCard).join("");
    // Trigger reveal animation
    requestAnimationFrame(() => {
      document.querySelectorAll(".project-card.reveal").forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 100);
      });
    });
    setupFilters();
    if (NOTE) {
      NOTE.textContent = `Showing ${projects.length} project${projects.length !== 1 ? "s" : ""}.`;
      NOTE.style.display = "block";
      NOTE.style.color = "var(--text-dim)";
    }
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
      let projects = repos
        .filter((r) => !r.fork) // exclude forked repos entirely
        .filter((r) => r.owner?.login === GITHUB_USER) // only repos owned by V0XRYN
        .filter((r) => !EXCLUDED.has(r.name));

      // Manual featured projects first (pinned), then recency-sorted rest
      if (FEATURED.length) {
        const featuredRepos = projects.filter((r) => FEATURED.includes(r.name));
        const otherRepos = projects.filter((r) => !FEATURED.includes(r.name));
        featuredRepos.sort((a, b) => FEATURED.indexOf(a.name) - FEATURED.indexOf(b.name));
        otherRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        projects = [...featuredRepos, ...otherRepos];
      } else {
        projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      }

      projects = projects.slice(0, PROJECTS_LIMIT);
      renderProjects(projects.length ? projects : FALLBACK);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      if (LOADING) LOADING.style.display = "none";
      if (ERROR) ERROR.style.display = "block";
      renderProjects(FALLBACK);
    }
  }

  fetchProjects();
})();
