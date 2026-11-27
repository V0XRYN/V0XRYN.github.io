/* ==========================================================================
   V0XRYN — Main interactivity
   Nav scroll, scroll spy, mobile menu, reveal-on-scroll, focus styles.
   ========================================================================== */

(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Elements
  // ------------------------------------------------------------------
  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");

  // ------------------------------------------------------------------
  // Navbar scroll effect
  // ------------------------------------------------------------------
  function onScroll() {
    if (window.scrollY > 20) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ------------------------------------------------------------------
  // Scroll spy — highlight active nav link based on visible section
  // ------------------------------------------------------------------
  function onScrollSpy() {
    const scrollPos = window.scrollY + 100;

    let current = null;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const id = section.getAttribute("id");
      if (scrollPos >= top && scrollPos < bottom) {
        current = id;
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === `#${current}`) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  // Throttle scroll spy
  let ticking = false;
  function requestScrollSpy() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScrollSpy();
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener("scroll", requestScrollSpy, { passive: true });

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
  // Reveal on scroll
  // ------------------------------------------------------------------
  const observerOptions = {
    threshold: 0.12,
    rootMargin: "0px 0px -80px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // ------------------------------------------------------------------
  // Footer year
  // ------------------------------------------------------------------
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ------------------------------------------------------------------
  // Keyboard navigation focus styles
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
