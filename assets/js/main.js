/* ==========================================================================
   V0XRYN — Main interactivity
   Mobile nav, scroll effects, reveal-on-scroll, focus styles.
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
