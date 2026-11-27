/* ==========================================================================
   V0XRYN — Portfolio JavaScript
   Project fetching from GitHub, terminal typing, mobile nav, scroll reveal
   ========================================================================== */

(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Config
  // ------------------------------------------------------------------
  const GITHUB_USER = "V0XRYN";
  const PROJECTS_LIMIT = 6;
  const TYPE_SPEED = 40;

  // ------------------------------------------------------------------
  // DOM elements
  // ------------------------------------------------------------------
  const terminalTypeEl = document.getElementById("terminal-type");
  const projectsGrid = document.getElementById("projects-grid");
  const projectsNote = document.getElementById("projects-note");
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");
  const yearEl = document.getElementById("year");

  // ------------------------------------------------------------------
  // Footer year
  // ------------------------------------------------------------------
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ------------------------------------------------------------------
  // Terminal typing effect (hero)
  // ------------------------------------------------------------------
  const aboutLines = [
    "Red Teamer | Security Researcher.",
    "Adversarial simulations & payload development.",
    "0x_Void_Operations.",
  ];

  let lineIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let linePause = false;

  function typeWriter() {
    if (!terminalTypeEl) return;

    const currentLine = aboutLines[lineIdx];

    if (!linePause) {
      if (!isDeleting) {
        terminalTypeEl.textContent = currentLine.slice(0, charIdx + 1);
        charIdx++;
        if (charIdx === currentLine.length) {
          linePause = true;
          setTimeout(typeWriter, 1400);
          return;
        }
      } else {
        terminalTypeEl.textContent = currentLine.slice(0, charIdx - 1);
        charIdx--;
        if (charIdx === 0) {
          isDeleting = false;
          lineIdx = (lineIdx + 1) % aboutLines.length;
        }
      }
    } else {
      linePause = false;
      isDeleting = true;
    }

    setTimeout(typeWriter, isDeleting ? TYPE_SPEED / 1.5 : TYPE_SPEED);
  }

  setTimeout(typeWriter, 800);

  // ------------------------------------------------------------------
  // Fetch real projects from GitHub
  // ------------------------------------------------------------------
  async function fetchProjects() {
    if (!projectsGrid || !projectsNote) return;

    // TOS-blocked repos that we cannot access
    const blocked = new Set([
      "ABHISHEK-SER",
      "Anya_v2-MD",
      "MIDDLE_STAR",
      "Ngk.rdp",
      "VAJIRA-MD-NEW",
      "whatsapp-bot-md",
    ]);

    // Skip repos that are not real personal/portfolio projects
    const skip = new Set([
      "oussamapunisher", // config files for profile
    ]);

    try {
      const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`,
        {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error("GitHub API responded " + res.status);
      }

      const repos = await res.json();

      const candidates = repos
        .filter((r) => !r.fork)
        .filter((r) => !blocked.has(r.name))
        .filter((r) => !skip.has(r.name))
        .filter((r) => r.name !== "V0XRYN.github.io")
        .map((r) => ({
          name: r.name,
          description: r.description || null,
          language: r.language || null,
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          html_url: r.html_url,
          updated_at: r.updated_at,
        }))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, PROJECTS_LIMIT);

      renderProjects(candidates);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      projectsNote.textContent =
        "Unable to load projects from GitHub right now. Please try again later.";
      projectsNote.style.color = "var(--text-dim)";
    }
  }

  function renderProjects(projects) {
    if (!projectsGrid || !projectsNote) return;

    projectsNote.style.display = "none";

    if (!projects.length) {
      projectsNote.style.display = "block";
      projectsNote.textContent = "No public projects available to display.";
      return;
    }

    projectsGrid.innerHTML = projects
      .map(
        (p) => `
      <article class="project-card reveal">
        <span class="project-badge">${p.language || "Code"}</span>
        <h3 class="project-title">${escapeHtml(p.name)}</h3>
        <p class="project-desc">
          ${escapeHtml(p.description || "No description available.")}
        </p>
        <div class="project-meta">
          <span class="project-lang mono">${p.language || "—"}</span>
          <a href="${p.html_url}" target="_blank" rel="noopener noreferrer" class="project-link">
            View on GitHub <span aria-hidden="true">→</span>
          </a>
        </div>
      </article>
    `
      )
      .join("");

    // Trigger reveal animation
    requestAnimationFrame(() => {
      document.querySelectorAll(".project-card.reveal").forEach((el, i) => {
        setTimeout(() => el.classList.add("visible"), i * 120);
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  fetchProjects();

  // ------------------------------------------------------------------
  // Mobile navigation
  // ------------------------------------------------------------------
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen);
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ------------------------------------------------------------------
  // Intersection Observer — reveal on scroll
  // ------------------------------------------------------------------
  const observerOptions = {
    threshold: 0.12,
    rootMargin: "0px 0px -60px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal").forEach((el) => {
    observer.observe(el);
  });

  // ------------------------------------------------------------------
  // Smooth focus styles for keyboard users
  // ------------------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      document.body.classList.add("keyboard-nav");
    }
  });
  document.addEventListener("mousedown", () => {
    document.body.classList.remove("keyboard-nav");
  });
})();
