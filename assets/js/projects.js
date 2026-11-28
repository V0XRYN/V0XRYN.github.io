/* ==========================================================================
   V0XRYN — Projects
   Loads public projects from GitHub API (merged with public-projects.json
   fallback) and private projects from private-projects.json.
   Renders into a single #projects section with Public/Private toggle and
   category filters (All / Web / AI / Cybersecurity / Tools).
   Features: Featured projects with rich cards, project detail modal,
   robust API handling with fallback, deduplication, accessibility.
   ========================================================================== */

(function () {
  "use strict";

  const GITHUB_USER = "V0XRYN";
  const PROJECTS_LIMIT = 8;

  // DOM elements
  const PUBLIC_GRID = document.getElementById("projects-grid");
  const PUBLIC_LOADING = document.getElementById("projects-loading");
  const PRIVATE_GRID = document.getElementById("private-projects-grid");
  const PRIVATE_LOADING = document.getElementById("private-projects-loading");
  const NOTE = document.getElementById("projects-note");
  const GROUP_PUBLIC = document.getElementById("group-public");
  const GROUP_PRIVATE = document.getElementById("group-private");

  // Repos we deliberately exclude (non-project / TOS-blocked / profile config / forks)
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

  // GitHub language colors
  const LANGUAGE_COLORS = {
    JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8", Rust: "#dea584",
    C: "#555555", "C++": "#f34b7d", "C#": "#178600", Java: "#b07219",
    TypeScript: "#2b7489", PHP: "#4F5D95", Ruby: "#701516", Shell: "#89e051",
    HTML: "#e34c26", CSS: "#563d7c", Lua: "#000080", Dart: "#0075EC",
    Kotlin: "#F18E33", Swift: "#FFAC45", Powershell: "#012456",
    Dockerfile: "#384d54", Jupyter: "#DA3B17", JSON: "#292929",
    YAML: "#cb171e", Markdown: "#083fa1", Nix: "#7ef5ff", Vim: "#019833",
    TeX: "#3D6117", Makefile: "#427819", Assembly: "#6E4C13", Perl: "#0298c3",
    R: "#198CE7", Scala: "#C22D40", Elixir: "#4e2a8c", Clojure: "#db5855",
    Haskell: "#5e5086", OCaml: "#3be133", Erlang: "#B83998", Julia: "#a270ba",
    Vue: "#41b883", React: "#61dafb", Svelte: "#ff3e00", Tailwind: "#06b6d4",
    Sass: "#cc6699", Less: "#1d365d", Angular: "#b00e32", jQuery: "#888898",
    Bootstrap: "#7952b3", Astro: "#ff5d01", Deno: "#000000", Bun: "#000000",
    Zig: "#f7a01b", Nim: "#377b6b", FSharp: "#378BBA", Elm: "#60B5CC",
    Nushell: "#2e8b57", SQL: "#2e8b57", PLpgSQL: "#146085", TSQL: "#2471a5",
  };

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function normalizeCategory(cat) {
    // Map various categories to our filter set (All, Web, AI, Cybersecurity, Tools)
    const map = {
      "linux": "tools",
      "ai": "ai",
      "security": "cybersecurity",
      "web": "web",
      "cybersecurity": "cybersecurity",
      "tools": "tools",
      "all": "all"
    };
    return map[cat.toLowerCase()] || "tools";
  }

  function categoryFor(repo) {
    const topics = (repo.topics || []).map((t) => t.toLowerCase());
    const name = repo.name.toLowerCase();
    const desc = (repo.description || "").toLowerCase();
    const all = topics.concat(name, desc).join(" ");
    if (all.includes("linux") || all.includes("arch") || all.includes("dotfiles") || all.includes("system")) return "tools";
    if (all.includes("ai") || all.includes("agent") || all.includes("llm") || all.includes("automation") || all.includes("ml")) return "ai";
    if (all.includes("secur") || all.includes("red") || all.includes("exploit") || all.includes("hack") || all.includes("crypto") || all.includes("pentest")) return "cybersecurity";
    if (all.includes("web") || all.includes("site") || all.includes("app") || all.includes("javascript") || all.includes("frontend") || all.includes("backend") || all.includes("fullstack")) return "web";
    return "tools";
  }

  function categoryForPrivate(project) {
    return normalizeCategory(project.category || "tools");
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

  function monogramColorFor(category) {
    switch (category) {
      case "tools": return "#2B8CFF";
      case "ai": return "#1B52FF";
      case "cybersecurity": return "#38D4FF";
      case "web": return "#2B8CFF";
      default: return "#1B52FF";
    }
  }

  function withLogoFallback(imgEl, projectName, category) {
    const fallbackSrc = monogramSvg(projectName, monogramColorFor(category));
    imgEl.onerror = function () {
      imgEl.onerror = null;
      imgEl.src = fallbackSrc;
    };
  }

  // Featured project data (manually curated for premium presentation)
  const FEATURED_PROJECTS = {
    "V0XRYN-WEB": {
      featured: true,
      name: "V0XRYN-WEB",
      tagline: "Modern streaming platform for immersive entertainment.",
      description: "A modern streaming platform built to deliver an immersive entertainment experience. Features a responsive web interface with live content streaming capabilities, multi-device support, and a cinematic dark UI.",
      category: "web",
      status: "LIVE",
      tags: ["web", "entertainment", "android", "streaming", "typescript"],
      logo: "assets/img/logos/v0xryn-web-preview.png",
      liveUrl: "https://bl4ck4rchl1nux-web.onrender.com/",
      previewType: "image",
      repoUrl: "https://github.com/V0XRYN/V0XRYN-WEB",
      technologies: ["TypeScript", "React", "Node.js", "Tailwind CSS", "FFmpeg"],
      features: [
        "Live streaming with adaptive bitrate",
        "Multi-device synchronization",
        "Cinematic dark theme UI",
        "Offline download support",
        "Real-time chat integration"
      ],
      isPrivate: false,
      updated_at: "2026-11-28T00:00:00Z"
    },
    "Discord-Security-Bot": {
      featured: true,
      name: "Discord-Security-Bot",
      tagline: "Intelligent Discord security bot for community protection.",
      description: "An intelligent Discord security bot designed to protect, moderate and manage communities. Includes automated threat detection, moderation tools, security analytics, and configurable rule engines.",
      category: "cybersecurity",
      status: "PRIVATE",
      tags: ["discord", "security", "bot", "python", "moderation"],
      logo: "assets/img/logos/discord-security-bot.svg",
      technologies: ["Python", "discord.py", "PostgreSQL", "Redis", "Docker"],
      features: [
        "Automated threat detection & response",
        "Advanced moderation toolkit",
        "Security audit logging",
        "Custom rule engine",
        "Multi-guild management"
      ],
      isPrivate: true
    }
  };

  function renderPublicCard(repo, isFeatured = false) {
    const cat = categoryFor(repo);
    const lang = repo.language || "Code";
    const desc = escapeHtml(repo.description || "No description available.");
    const name = escapeHtml(repo.name);
    const stars = repo.stargazers_count || 0;
    const updated = repo.updated_at ? relativeDate(repo.updated_at) : "";
    const tags = (repo.topics || []).slice(0, 4);
    const langColor = languageColor(lang);
    const repoUrl = repo.html_url;
    const featuredData = FEATURED_PROJECTS[repo.name];

    // Logo: try custom logo from topics, else placeholder with monogram fallback
    let logoSrc = `assets/img/logos/placeholder.svg?name=${encodeURIComponent(repo.name)}`;
    const logoTopic = (repo.topics || []).find((t) => t.startsWith("logo:"));
    if (logoTopic) {
      logoSrc = logoTopic.replace("logo:", "");
    }

    // Use featured data if available
    const finalDesc = featuredData ? escapeHtml(featuredData.tagline + " " + featuredData.description) : desc;
    const finalTags = featuredData ? featuredData.tags.slice(0, 4) : tags;
    const finalCategory = featuredData ? featuredData.category : cat;
    const finalStatus = featuredData ? featuredData.status : "";
    const finalPreviewType = featuredData ? featuredData.previewType : "image";
    const finalLiveUrl = featuredData ? featuredData.liveUrl : null;
    const finalLogo = featuredData ? featuredData.logo : logoSrc;
    const finalRepoUrl = featuredData && featuredData.repoUrl ? featuredData.repoUrl : repoUrl;

    const isLive = finalStatus === "LIVE";
    const statusBadge = finalStatus
      ? `<span class="project-badge ${isLive ? "project-badge-live" : "project-badge-private"}" title="${escapeHtml(isLive ? "Live website" : "Private repository")}">${escapeHtml(finalStatus)}</span>`
      : "";

    // Preview content
    let previewContent;
    if (isLive && finalLiveUrl && finalPreviewType === "iframe") {
      previewContent = `
        <iframe
          src="${escapeHtml(finalLiveUrl)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title="${escapeHtml(`${repo.name} live preview`)}"
        ></iframe>
      `;
    } else {
      previewContent = `
        <img
          src="${escapeHtml(finalLogo)}"
          alt="${escapeHtml(`Preview of ${repo.name}`)}"
          loading="lazy"
          decoding="async"
          width="300"
          height="180"
        >
      `;
    }

    const cardClass = isFeatured ? "project-card project-card-featured reveal" : "project-card reveal";

    return `
      <article class="${cardClass}" data-category="${finalCategory}" data-id="${escapeHtml(repo.name)}" data-scope="public" ${isFeatured ? 'data-featured="true"' : ''}>
        <div class="project-preview" aria-hidden="true">
          ${previewContent}
        </div>
        ${statusBadge}
        <div class="project-content">
          <div class="project-header">
            <span class="project-category">${escapeHtml(finalCategory.charAt(0).toUpperCase() + finalCategory.slice(1))}</span>
            <span class="project-language" style="color:${langColor}">● ${escapeHtml(lang)}</span>
          </div>
          <h3 class="project-title">${name}</h3>
          <p class="project-desc">${finalDesc}</p>
          <div class="project-footer">
            <div class="project-meta">
              <span title="Stars">${stars} ★</span>
              ${updated ? `<span title="Last updated">${updated}</span>` : ""}
            </div>
            <div class="project-tags">
              ${finalTags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
            </div>
            <div class="project-links">
              ${isLive && finalLiveUrl ? `<a href="${escapeHtml(finalLiveUrl)}" target="_blank" rel="noopener noreferrer" class="project-link project-link-primary">Visit Website <span aria-hidden="true">→</span></a>` : ""}
              <a href="${escapeHtml(finalRepoUrl)}" target="_blank" rel="noopener noreferrer" class="project-link">GitHub <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderPrivateCard(project) {
    const cat = categoryForPrivate(project);
    const desc = escapeHtml(project.description || "No description available.");
    const name = escapeHtml(project.name);
    const tags = (project.tags || []).slice(0, 4);
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

    const mailtoLink = project.mailto
      ? `<a href="mailto:${escapeHtml(project.mailto)}?subject=Project%20Inquiry:%20${encodeURIComponent(project.name)}" class="project-link project-link-primary">Request Details <span aria-hidden="true">→</span></a>`
      : `<span class="project-source-private">Private Repository</span>`;

    const isFeaturedPrivate = FEATURED_PROJECTS[project.name];
    return `
      <article class="project-card reveal project-card-private" data-category="${cat}" data-id="${escapeHtml(project.slug)}" data-scope="private" ${isFeaturedPrivate ? 'data-featured="true"' : ''}>
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

  // Project detail modal for featured projects
  function createProjectModal(project) {
    const modalId = `modal-${project.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
    const cat = normalizeCategory(project.featured ? project.category : categoryFor(project));
    const tags = project.tags || (project.topics || []).slice(0, 6);
    const technologies = project.technologies || [];
    const features = project.features || [];
    const isPrivate = project.isPrivate || false;
    const isLive = project.status === "LIVE";
    const liveUrl = project.liveUrl;
    const repoUrl = project.repoUrl || project.html_url;

    return `
      <div class="modal-overlay" id="${modalId}" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title" hidden>
        <div class="modal-container">
          <button class="modal-close" aria-label="Close project details">&times;</button>
          <div class="modal-content">
            <div class="modal-preview">
              ${isLive && liveUrl && project.previewType === "iframe"
                ? `<iframe src="${escapeHtml(liveUrl)}" title="${escapeHtml(`${project.name} live preview`)}" referrerpolicy="no-referrer-when-downgrade" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>`
                : `<img src="${escapeHtml(project.logo)}" alt="${escapeHtml(`Cover for ${project.name}`)}" loading="lazy">`
              }
              ${project.status ? `<span class="project-badge ${isLive ? "project-badge-live" : "project-badge-private"}">${escapeHtml(project.status)}</span>` : ""}
            </div>
            <div class="modal-body">
              <div class="modal-header">
                <span class="project-category">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</span>
                <h2 id="${modalId}-title" class="modal-title">${escapeHtml(project.name)}</h2>
              </div>
              <p class="modal-tagline">${escapeHtml(project.tagline || project.description || "")}</p>
              <p class="modal-desc">${escapeHtml(project.description)}</p>

              ${technologies.length > 0 ? `
                <div class="modal-section">
                  <h3>Technologies</h3>
                  <div class="modal-tags">
                    ${technologies.map(t => `<span>${escapeHtml(t)}</span>`).join("")}
                  </div>
                </div>
              ` : ""}

              ${features.length > 0 ? `
                <div class="modal-section">
                  <h3>Key Features</h3>
                  <ul class="modal-features">
                    ${features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
                  </ul>
                </div>
              ` : ""}

              ${tags.length > 0 ? `
                <div class="modal-section">
                  <h3>Tags</h3>
                  <div class="modal-tags">
                    ${tags.map(t => `<span>${escapeHtml(t)}</span>`).join("")}
                  </div>
                </div>
              ` : ""}

              <div class="modal-actions">
                ${isLive && liveUrl ? `<a href="${escapeHtml(liveUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Visit Website <span aria-hidden="true">→</span></a>` : ""}
                ${!isPrivate && repoUrl ? `<a href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">View on GitHub <span aria-hidden="true">→</span></a>` : ""}
                ${isPrivate && project.mailto ? `<a href="mailto:${escapeHtml(project.mailto)}?subject=Project%20Inquiry:%20${encodeURIComponent(project.name)}" class="btn btn-ghost">Request Details <span aria-hidden="true">→</span></a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function setupProjectModals() {
    // Add modal HTML to document
    const modalContainer = document.getElementById("project-modals") || (() => {
      const div = document.createElement("div");
      div.id = "project-modals";
      document.body.appendChild(div);
      return div;
    })();

    // Collect all featured projects (public + private)
    const allFeatured = { ...FEATURED_PROJECTS };

    // Add private featured projects
    fetch("data/private-projects.json", { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(projects => {
        projects.forEach(p => {
          if (FEATURED_PROJECTS[p.name]) {
            allFeatured[p.name] = { ...FEATURED_PROJECTS[p.name], ...p };
          }
        });
        modalContainer.innerHTML = Object.values(allFeatured).map(createProjectModal).join("");
        attachModalListeners();
      })
      .catch(() => {
        modalContainer.innerHTML = Object.values(FEATURED_PROJECTS).map(createProjectModal).join("");
        attachModalListeners();
      });

    function attachModalListeners() {
      document.querySelectorAll(".modal-overlay").forEach(modal => {
        const closeBtn = modal.querySelector(".modal-close");
        closeBtn?.addEventListener("click", () => closeModal(modal));
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeModal(modal);
        });
      });

      // Open modal on "Explore Project" or card click for featured
      document.querySelectorAll('.project-card[data-featured="true"]').forEach(card => {
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
          // Don't open modal if clicking on a link/button
          if (e.target.closest("a, button, iframe")) return;
          const projectName = card.dataset.id;
          const modal = document.getElementById(`modal-${projectName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`);
          if (modal) openModal(modal);
        });
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const projectName = card.dataset.id;
            const modal = document.getElementById(`modal-${projectName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`);
            if (modal) openModal(modal);
          }
        });
      });
    }
  }

  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => modal.classList.add("open"));
    const closeBtn = modal.querySelector(".modal-close");
    closeBtn?.focus();
    document.addEventListener("keydown", handleModalKeydown);
  }

  function closeModal(modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => { modal.hidden = true; }, 300);
    document.removeEventListener("keydown", handleModalKeydown);
  }

  function handleModalKeydown(e) {
    if (e.key === "Escape") {
      const openModal = document.querySelector(".modal-overlay.open");
      if (openModal) closeModal(openModal);
    }
    if (e.key === "Tab") {
      // Trap focus within modal
      const modal = document.querySelector(".modal-overlay.open");
      if (modal) {
        const focusable = modal.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  function renderProjects(projects, isPrivate = false) {
    const grid = isPrivate ? PRIVATE_GRID : PUBLIC_GRID;
    const loading = isPrivate ? PRIVATE_LOADING : PUBLIC_LOADING;
    if (!grid) return;
    if (loading) loading.style.display = "none";

    // Sort: featured first, then by updated date
    const sorted = [...projects].sort((a, b) => {
      const aFeatured = FEATURED_PROJECTS[a.name] || (isPrivate && FEATURED_PROJECTS[a.slug]);
      const bFeatured = FEATURED_PROJECTS[b.name] || (isPrivate && FEATURED_PROJECTS[b.slug]);
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      const aDate = new Date(a.updated_at || a.pushedAt || 0);
      const bDate = new Date(b.updated_at || b.pushedAt || 0);
      return bDate - aDate;
    });

    const cardsHtml = sorted.map(p => {
      const isFeatured = !isPrivate && FEATURED_PROJECTS[p.name];
      return isPrivate ? renderPrivateCard(p) : renderPublicCard(p, isFeatured);
    }).join("");

    grid.innerHTML = cardsHtml;

    // Apply logo fallbacks for images
    grid.querySelectorAll(".project-preview img").forEach((img) => {
      const card = img.closest(".project-card");
      const name = card?.querySelector(".project-title")?.textContent || "Project";
      const cat = card?.dataset.category || "web";
      withLogoFallback(img, name, cat);
    });

    // Trigger reveal animations
    requestAnimationFrame(() => {
      const cards = grid.querySelectorAll(".project-card.reveal");
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cards.forEach((el, i) => {
        if (prefersReduced) {
          el.classList.add("visible");
        } else {
          setTimeout(() => el.classList.add("visible"), i * 80);
        }
      });
    });

    setupFilters();
    updateNote();
    setupProjectModals();
  }

  function updateNote() {
    if (!NOTE) return;
    // GROUP_PUBLIC.style.display === "none" means public is HIDDEN
    // GROUP_PRIVATE.style.display === "none" means private is HIDDEN
    const publicGroupHidden = GROUP_PUBLIC?.style.display === "none";
    const privateGroupHidden = GROUP_PRIVATE?.style.display === "none";
    
    // Filter by visible category
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    
    const getVisibleCount = (grid, scope) => {
      if (!grid) return 0;
      const cards = grid.querySelectorAll(`.project-card[data-scope="${scope}"]`);
      let count = 0;
      cards.forEach(card => {
        const cat = card.dataset.category;
        if (activeFilter === "all" || cat === activeFilter) {
          const display = window.getComputedStyle(card).display;
          if (display !== "none") count++;
        }
      });
      return count;
    };
    
    const visiblePublic = publicGroupHidden ? 0 : getVisibleCount(PUBLIC_GRID, "public");
    const visiblePrivate = privateGroupHidden ? 0 : getVisibleCount(PRIVATE_GRID, "private");
    const total = visiblePublic + visiblePrivate;
    const scope = publicGroupHidden ? "private" : (privateGroupHidden ? "public" : "all");
    let label = "";
    if (scope === "public") label = `${visiblePublic} public project${visiblePublic !== 1 ? "s" : ""}`;
    else if (scope === "private") label = `${visiblePrivate} private project${visiblePrivate !== 1 ? "s" : ""}`;
    else label = `${total} project${total !== 1 ? "s" : ""} (${visiblePublic} public, ${visiblePrivate} private)`;
    NOTE.textContent = `Showing ${label}.`;
    NOTE.style.display = "block";
    NOTE.style.color = "var(--text-dim)";
  }

  function setupFilters() {
    // Re-query buttons each time (handles dynamic content)
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach((btn) => {
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
    const toggleBtns = document.querySelectorAll(".toggle-btn");
    toggleBtns.forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const scope = btn.dataset.scope;
        if (scope === "public") {
          GROUP_PUBLIC.style.display = "";
          GROUP_PRIVATE.style.display = "none";
        } else {
          GROUP_PUBLIC.style.display = "none";
          GROUP_PRIVATE.style.display = "";
        }
        // Re-apply active filter
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

  async function loadPrivateProjects() {
    try {
      const res = await fetch("data/private-projects.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load private-projects.json");
      const projects = await res.json();
      renderProjects(projects, true);
    } catch (err) {
      console.error("Failed to load private projects:", err);
      if (PRIVATE_LOADING) PRIVATE_LOADING.style.display = "none";
      if (PRIVATE_GRID) {
        PRIVATE_GRID.innerHTML = '<p class="projects-note">Private projects could not be loaded.</p>';
      }
    }
  }

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

  async function fetchAndRenderPublic() {
    if (!PUBLIC_GRID || !PUBLIC_LOADING) return;

    let apiProjects = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`,
        {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store",
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

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
      console.warn("GitHub API unavailable, using JSON fallback:", err.message);
      // Continue with empty API projects - fallback will handle rendering
    }

    // Load JSON fallback (always succeeds on GitHub Pages)
    const fallbackProjects = await loadPublicFallback();

    // Merge: prefer API projects, but include JSON projects not already present
    const apiNames = new Set(apiProjects.map(r => r.name));
    const merged = [...apiProjects];
    for (const fb of fallbackProjects) {
      if (!apiNames.has(fb.name)) {
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
        apiNames.add(fb.name);
      }
    }

    // Inject featured projects that aren't already present (ensures they render
    // even when the GitHub API is unavailable)
    for (const [name, feat] of Object.entries(FEATURED_PROJECTS)) {
      if (!feat.isPrivate && !apiNames.has(name)) {
        merged.push({
          name: feat.name,
          description: feat.tagline + " " + feat.description,
          language: "Code",
          html_url: feat.repoUrl || `https://github.com/${GITHUB_USER}/${name}`,
          stargazers_count: 0,
          updated_at: feat.updated_at || new Date().toISOString(),
          topics: feat.tags,
          forks_count: 0,
          open_issues_count: 0
        });
        apiNames.add(name);
      }
    }

    // Always render with merged projects (API + fallback)
    renderProjects(merged.length ? merged : fallbackProjects, false);
  }

  async function init() {
    setupFilters();
    setupToggle();
    await Promise.all([fetchAndRenderPublic(), loadPrivateProjects()]);
  }

  init();
})();