/* ==========================================================================
   V0XRYN — Projects
   Loads public projects from GitHub API (merged with public-projects.json
   fallback) and private projects from private-projects.json.
   Renders into a single #projects section with Public/Private toggle and
   category filters (All / Linux / AI / Security / Web).
   ========================================================================== */

(function () {
  "use strict";

  const GITHUB_USER = "V0XRYN";
  const PROJECTS_LIMIT = 6;

  // DOM elements (new structure)
  const PUBLIC_GRID = document.getElementById("projects-grid");
  const PUBLIC_LOADING = document.getElementById("projects-loading");
  const PRIVATE_GRID = document.getElementById("private-projects-grid");
  const PRIVATE_LOADING = document.getElementById("private-projects-loading");
  const NOTE = document.getElementById("projects-note");
  const FILTER_BTNS = document.querySelectorAll(".filter-btn");
  const TOGGLE_BTNS = document.querySelectorAll(".toggle-btn");
  const GROUP_PUBLIC = document.getElementById("group-public");
  const GROUP_PRIVATE = document.getElementById("group-private");

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

  function categoryForPrivate(project) {
    return project.category || "all";
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

  function initials(name) {
    return name
      .split(/[\s\-_]+/)
      .map((w) => w.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }

  // Generate a monogram SVG fallback using brand colors
  function monogramSvg(name, bgColor) {
    const text = initials(name);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="${escapeHtml(name)} logo">
        <rect width="120" height="120" fill="${bgColor}"/>
        <text x="60" y="74" font-family="Orbitron, Inter, sans-serif" font-size="48" font-weight="700" fill="#080B12" text-anchor="middle" dominant-baseline="central">${escapeHtml(text)}</text>
      </svg>
    `;
    return "data:image/svg+xml;base64," + btoa(svg);
  }

  // Pick a brand color for monogram background based on category
  function monogramColorFor(category) {
    switch (category) {
      case "linux": return "#2B8CFF"; // Electric Blue
      case "ai": return "#1B52FF";    // Deep Blue
      case "security": return "#38D4FF"; // Cyan
      case "web": return "#2B8CFF";   // Electric Blue
      default: return "#1B52FF";
    }
  }

  // Try to load image, fall back to monogram on error
  function withLogoFallback(imgEl, projectName, category) {
    const fallbackSrc = monogramSvg(projectName, monogramColorFor(category));
    imgEl.onerror = function () {
      imgEl.onerror = null; // prevent loop
      imgEl.src = fallbackSrc;
    };
  }

  function renderPublicCard(repo) {
    const cat = categoryFor(repo);
    const lang = repo.language || "Code";
    const desc = escapeHtml(repo.description || "No description available.");
    const name = escapeHtml(repo.name);
    const stars = repo.stargazers_count || 0;
    const updated = repo.updated_at ? relativeDate(repo.updated_at) : "";
    const tags = (repo.topics || []).slice(0, 3);
    const langColor = languageColor(lang);
    const repoUrl = repo.html_url;

    // Logo: try custom logo from topics, else placeholder with monogram fallback
    let logoSrc = `assets/img/logos/placeholder.svg?name=${encodeURIComponent(repo.name)}`;
    const logoTopic = (repo.topics || []).find((t) => t.startsWith("logo:"));
    if (logoTopic) {
      logoSrc = logoTopic.replace("logo:", "");
    }

    return `
      <article class="project-card reveal" data-category="${cat}" data-id="${escapeHtml(repo.name)}" data-scope="public">
        <div class="project-preview" aria-hidden="true">
          <img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(`Preview of ${repo.name}`)}" loading="lazy" decoding="async" width="300" height="180">
        </div>
        <div class="project-content">
          <div class="project-header">
            <span class="project-category">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</span>
            <span class="project-language" style="color:${langColor}">● ${escapeHtml(lang)}</span>
          </div>
          <h3 class="project-title">${name}</h3>
          <p class="project-desc">${desc}</p>
          <div class="project-footer">
            <div class="project-meta">
              <span title="Stars">${stars} ★</span>
              ${updated ? `<span title="Last updated">${updated}</span>` : ""}
            </div>
            <div class="project-tags">
              ${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
            </div>
            <a href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener noreferrer" class="project-link">View on GitHub <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </article>
    `;
  }

  function renderPrivateCard(project) {
    const cat = categoryForPrivate(project);
    const desc = escapeHtml(project.description || "No description available.");
    const name = escapeHtml(project.name);
    const tags = (project.tags || []).slice(0, 3);
    const status = project.status || "ACTIVE";
    const isLive = status === "LIVE";
    const statusBadgeClass = isLive ? "project-badge-live" : "project-badge-private";
    const statusBadgeTitle = isLive ? "Live website" : "Private repository";
    const statusBadgeText = isLive ? "LIVE" : "PRIVATE";

    const privateBadge = `
      <span class="project-badge ${statusBadgeClass}" title="${escapeHtml(statusBadgeTitle)}">${statusBadgeText}</span>
    `;

    // Preview content: iframe for LIVE with liveUrl, else logo image
    let previewContent;
    if (isLive && project.liveUrl && project.previewType === "iframe") {
      previewContent = `
        <iframe
          src="${escapeHtml(project.liveUrl)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title="${escapeHtml(`${project.name} live preview`)}"
        ></iframe>
      `;
    } else {
      previewContent = `
        <img
          src="${escapeHtml(project.logo)}"
          alt="${escapeHtml(`Cover for ${project.name}`)}"
          loading="lazy"
          decoding="async"
          width="300"
          height="180"
        >
      `;
    }

    // Source link: mailto for "Request details" (no repo URL exposed)
    const mailtoLink = project.mailto
      ? `<a href="mailto:${escapeHtml(project.mailto)}?subject=Project%20Inquiry:%20${encodeURIComponent(project.name)}" class="project-link">Request details <span aria-hidden="true">→</span></a>`
      : `<span class="project-source-private">Private Repository</span>`;

    return `
      <article class="project-card reveal project-card-private" data-category="${cat}" data-id="${escapeHtml(project.slug)}" data-scope="private">
        <div class="project-preview" aria-hidden="true">
          ${previewContent}
        </div>
        ${privateBadge}
        <div class="project-content">
          <div class="project-header">
            <span class="project-category">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</span>
            <span class="project-language" style="color:var(--text-dim)">● Private</span>
          </div>
          <h3 class="project-title">${name}</h3>
          <p class="project-status">${escapeHtml(status)}</p>
          <p class="project-desc">${desc}</p>
          <div class="project-footer">
            <div class="project-tags">
              ${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
            </div>
            ${mailtoLink}
          </div>
        </div>
      </article>
    `;
  }

  function renderProjects(projects, isPrivate = false) {
    const grid = isPrivate ? PRIVATE_GRID : PUBLIC_GRID;
    const loading = isPrivate ? PRIVATE_LOADING : PUBLIC_LOADING;
    if (!grid) return;
    if (loading) loading.style.display = "none";

    const cardsHtml = projects.map(p => isPrivate ? renderPrivateCard(p) : renderPublicCard(p)).join("");
    grid.innerHTML = cardsHtml;

    // Apply logo fallbacks for images
    grid.querySelectorAll(".project-preview img").forEach((img) => {
      const card = img.closest(".project-card");
      const name = card?.querySelector(".project-title")?.textContent || "Project";
      const cat = card?.dataset.category || "web";
      withLogoFallback(img, name, cat);
    });

    // Trigger reveal animations (respects prefers-reduced-motion via CSS)
    requestAnimationFrame(() => {
      const cards = grid.querySelectorAll(".project-card.reveal");
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cards.forEach((el, i) => {
        if (prefersReduced) {
          el.classList.add("visible");
        } else {
          setTimeout(() => el.classList.add("visible"), i * 100);
        }
      });
    });

    setupFilters();
    updateNote();
  }

  function updateNote() {
    if (!NOTE) return;
    const visiblePublic = PUBLIC_GRID ? PUBLIC_GRID.querySelectorAll('.project-card[data-scope="public"]:not([style*="display: none"])').length : 0;
    const visiblePrivate = PRIVATE_GRID ? PRIVATE_GRID.querySelectorAll('.project-card[data-scope="private"]:not([style*="display: none"])').length : 0;
    const total = visiblePublic + visiblePrivate;
    const scope = GROUP_PRIVATE?.style.display === "none" ? "public" : (GROUP_PUBLIC?.style.display === "none" ? "private" : "all");
    let label = "";
    if (scope === "public") label = `${visiblePublic} public project${visiblePublic !== 1 ? "s" : ""}`;
    else if (scope === "private") label = `${visiblePrivate} private project${visiblePrivate !== 1 ? "s" : ""}`;
    else label = `${total} project${total !== 1 ? "s" : ""} (${visiblePublic} public, ${visiblePrivate} private)`;
    NOTE.textContent = `Showing ${label}.`;
    NOTE.style.display = "block";
    NOTE.style.color = "var(--text-dim)";
  }

  function setupFilters() {
    FILTER_BTNS.forEach((btn) => {
      // Remove existing listeners by cloning (simple approach)
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    // Re-query after cloning
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
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
        updateNote();
      });
    });
  }

  function setupToggle() {
    TOGGLE_BTNS.forEach((btn) => {
      btn.addEventListener("click", () => {
        TOGGLE_BTNS.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const scope = btn.dataset.scope;
        if (scope === "public") {
          GROUP_PUBLIC.style.display = "";
          GROUP_PRIVATE.style.display = "none";
        } else {
          GROUP_PUBLIC.style.display = "none";
          GROUP_PRIVATE.style.display = "";
        }
        // Re-apply active filter to newly visible group
        const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
        document.querySelectorAll(".project-card").forEach((card) => {
          const cat = card.dataset.category;
          const cardScope = card.dataset.scope;
          const scopeMatch = (scope === "all") || (cardScope === scope);
          const filterMatch = (activeFilter === "all" || cat === activeFilter);
          if (scopeMatch && filterMatch) {
            card.style.display = "";
            card.classList.add("reveal");
            requestAnimationFrame(() => card.classList.add("visible"));
          } else {
            card.style.display = "none";
          }
        });
        updateNote();
      });
    });
  }

  // Load private projects from JSON (single source of truth)
  async function loadPrivateProjects() {
    try {
      const res = await fetch("data/private-projects.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load private-projects.json");
      const projects = await res.json();
      renderProjects(projects, true);
    } catch (err) {
      console.error("Failed to load private projects:", err);
      if (PRIVATE_LOADING) PRIVATE_LOADING.style.display = "none";
      if (PRIVATE_GRID) PRIVATE_GRID.innerHTML = "";
    }
  }

  // Load public projects from JSON (fallback)
  async function loadPublicFallback() {
    try {
      const res = await fetch("data/public-projects.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load public-projects.json");
      return await res.json();
    } catch (err) {
      console.error("Failed to load public fallback:", err);
      return [];
    }
  }

  // Fetch from GitHub API, merge with JSON fallback
  async function fetchAndRenderPublic() {
    if (!PUBLIC_GRID || !PUBLIC_LOADING) return;

    let apiProjects = [];
    let apiFailed = false;

    try {
      const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`,
        { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error("GitHub API responded " + res.status);
      const repos = await res.json();

      apiProjects = repos
        .filter((r) => !r.fork)
        .filter((r) => r.owner?.login === GITHUB_USER)
        .filter((r) => !EXCLUDED.has(r.name));

      if (FEATURED.length) {
        const featuredRepos = apiProjects.filter((r) => FEATURED.includes(r.name));
        const otherRepos = apiProjects.filter((r) => !FEATURED.includes(r.name));
        featuredRepos.sort((a, b) => FEATURED.indexOf(a.name) - FEATURED.indexOf(b.name));
        otherRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        apiProjects = [...featuredRepos, ...otherRepos];
      } else {
        apiProjects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      }

      apiProjects = apiProjects.slice(0, PROJECTS_LIMIT);
    } catch (err) {
      console.warn("GitHub API unavailable, using JSON fallback:", err);
      apiFailed = true;
    }

    // Load JSON fallback
    const fallbackProjects = await loadPublicFallback();

    // Merge: prefer API projects, but include JSON projects not already present
    const apiNames = new Set(apiProjects.map(r => r.name));
    const merged = [...apiProjects];
    for (const fb of fallbackProjects) {
      if (!apiNames.has(fb.name)) {
        // Convert JSON schema to API-like shape for renderPublicCard
        merged.push({
          name: fb.name,
          description: fb.tagline + " " + fb.description,
          language: (fb.tags.find(t => ["JavaScript", "Python", "Go", "Rust", "TypeScript", "HTML", "CSS", "Shell"].includes(t))) || "Code",
          html_url: fb.repo_url,
          stargazers_count: 0,
          updated_at: new Date().toISOString(),
          topics: fb.tags,
          forks_count: 0,
          open_issues_count: 0
        });
      }
    }

    // If API failed and no fallback projects, show empty state silently
    renderProjects(merged.length ? merged : fallbackProjects, false);
  }

  // Initialize
  async function init() {
    setupFilters();
    setupToggle();
    await Promise.all([fetchAndRenderPublic(), loadPrivateProjects()]);
  }

  init();
})();