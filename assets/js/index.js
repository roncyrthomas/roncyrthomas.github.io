/* ===== ANTIGRAVITY 3D PARTICLE SIMULATION ===== */
function initParticles() {
  var canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var ctx = canvas.getContext("2d");
  var particles = [];
  var mouse = { x: -9999, y: -9999 };
  var raf;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var isMobile = window.innerWidth < 768;
  var DENSITY = isMobile ? 18000 : 12000;
  var MAX_PARTICLES = isMobile ? 50 : 100;
  var CONNECTION_DIST = isMobile ? 110 : 150;
  var CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
  var MOUSE_RADIUS = 160;
  var MOUSE_FORCE = 0.6;

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
  }

  function Particle() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.z = Math.random(); /* 0 = far, 1 = near */
    this.baseVx = (Math.random() - 0.5) * 0.5;
    this.baseVy = (Math.random() - 0.5) * 0.5;
    this.vx = this.baseVx;
    this.vy = this.baseVy;
    this.vz = (Math.random() - 0.5) * 0.003;
    this.baseRadius = 1.2 + Math.random() * 2.5;
  }

  function getCount() {
    var area = window.innerWidth * window.innerHeight;
    return Math.min(Math.floor(area / DENSITY), MAX_PARTICLES);
  }

  function createParticles() {
    particles = [];
    var count = getCount();
    for (var i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function draw() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    var len = particles.length;
    var i, j, p, p2, dx, dy, distSq, dist, depthScale, depthAlpha, depthSpeed, radius;

    /* Update positions + mouse repulsion */
    for (i = 0; i < len; i++) {
      p = particles[i];

      /* Mouse repulsion */
      dx = p.x - mouse.x;
      dy = p.y - mouse.y;
      distSq = dx * dx + dy * dy;
      if (distSq < MOUSE_RADIUS * MOUSE_RADIUS && distSq > 0) {
        dist = Math.sqrt(distSq);
        var force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
        var angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force * 0.08;
        p.vy += Math.sin(angle) * force * 0.08;
      }

      /* Dampen velocity back toward base */
      p.vx += (p.baseVx - p.vx) * 0.02;
      p.vy += (p.baseVy - p.vy) * 0.02;

      /* Depth movement */
      depthSpeed = 0.3 + p.z * 0.7;
      p.x += p.vx * depthSpeed;
      p.y += p.vy * depthSpeed;

      /* Z drift */
      p.z += p.vz;
      if (p.z < 0) { p.z = 0; p.vz = Math.abs(p.vz); }
      if (p.z > 1) { p.z = 1; p.vz = -Math.abs(p.vz); }

      /* Edge wrapping */
      var margin = 40;
      if (p.x < -margin) p.x = w + margin;
      if (p.x > w + margin) p.x = -margin;
      if (p.y < -margin) p.y = h + margin;
      if (p.y > h + margin) p.y = -margin;
    }

    /* Sort by z for back-to-front rendering */
    particles.sort(function (a, b) { return a.z - b.z; });

    /* Draw connections */
    ctx.lineCap = "round";
    for (i = 0; i < len; i++) {
      p = particles[i];
      for (j = i + 1; j < len; j++) {
        p2 = particles[j];
        dx = p.x - p2.x;
        dy = p.y - p2.y;
        distSq = dx * dx + dy * dy;

        if (distSq < CONNECTION_DIST_SQ) {
          dist = Math.sqrt(distSq);
          var lineAlpha = (1 - dist / CONNECTION_DIST) * 0.2;
          var depthFactor = (p.z + p2.z) * 0.5;
          lineAlpha *= 0.15 + depthFactor * 0.85;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = "rgba(99, 102, 241, " + lineAlpha.toFixed(3) + ")";
          ctx.lineWidth = 0.4 + depthFactor * 0.6;
          ctx.stroke();
        }
      }
    }

    /* Draw mouse connections */
    if (mouse.x > 0 && mouse.y > 0) {
      for (i = 0; i < len; i++) {
        p = particles[i];
        dx = p.x - mouse.x;
        dy = p.y - mouse.y;
        distSq = dx * dx + dy * dy;
        if (distSq < CONNECTION_DIST_SQ * 1.5) {
          dist = Math.sqrt(distSq);
          var mAlpha = (1 - dist / (CONNECTION_DIST * 1.22)) * 0.15;
          if (mAlpha > 0) {
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = "rgba(99, 102, 241, " + mAlpha.toFixed(3) + ")";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    /* Draw particles */
    for (i = 0; i < len; i++) {
      p = particles[i];
      depthScale = 0.3 + p.z * 0.7;
      depthAlpha = 0.12 + p.z * 0.45;
      radius = p.baseRadius * depthScale;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 102, 241, " + depthAlpha.toFixed(3) + ")";
      ctx.fill();

      /* Subtle glow on near particles */
      if (p.z > 0.7) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, " + ((p.z - 0.7) * 0.08).toFixed(3) + ")";
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(draw);
  }

  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener("mouseleave", function () {
    mouse.x = -9999;
    mouse.y = -9999;
  }, { passive: true });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      cancelAnimationFrame(raf);
      isMobile = window.innerWidth < 768;
      DENSITY = isMobile ? 18000 : 12000;
      MAX_PARTICLES = isMobile ? 50 : 100;
      CONNECTION_DIST = isMobile ? 110 : 150;
      CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      resize();
      createParticles();
      raf = requestAnimationFrame(draw);
    }, 200);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }
  });

  resize();
  createParticles();
  raf = requestAnimationFrame(draw);
}

/* ===== 3D TILT EFFECT ===== */
function initTilt() {
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

  var cards = document.querySelectorAll("[data-tilt]");
  cards.forEach(function (card) {
    var maxTilt = parseFloat(card.getAttribute("data-tilt-max")) || 6;

    card.addEventListener("mousemove", function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var rotateY = ((x - rect.width / 2) / (rect.width / 2)) * maxTilt;
      var rotateX = ((rect.height / 2 - y) / (rect.height / 2)) * maxTilt;
      card.style.transition = "transform 0.1s ease-out";
      card.style.transform = "perspective(800px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) scale3d(1.01,1.01,1.01)";
    });

    card.addEventListener("mouseleave", function () {
      card.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
      card.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)";
    });
  });
}

/* ===== TYPING ANIMATION ===== */
function TxtType(el, toRotate, period) {
  this.toRotate = toRotate;
  this.el = el;
  this.loopNum = 0;
  this.period = parseInt(period, 10) || 2000;
  this.txt = "";
  this.isDeleting = false;
  this.tick();
}

TxtType.prototype.tick = function () {
  var i = this.loopNum % this.toRotate.length;
  var fullTxt = this.toRotate[i];

  if (this.isDeleting) {
    this.txt = fullTxt.substring(0, this.txt.length - 1);
  } else {
    this.txt = fullTxt.substring(0, this.txt.length + 1);
  }

  this.el.querySelector(".wrap").textContent = this.txt;

  var that = this;
  var delta = 100 - Math.floor(Math.random() * 50);

  if (this.isDeleting) delta /= 2;

  if (!this.isDeleting && this.txt === fullTxt) {
    delta = this.period;
    this.isDeleting = true;
  } else if (this.isDeleting && this.txt === "") {
    this.isDeleting = false;
    this.loopNum++;
    delta = 400;
  }

  this.timeoutId = setTimeout(function () { that.tick(); }, delta);
};

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
  var reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });

  reveals.forEach(function (el) { observer.observe(el); });
}

/* ===== NAVBAR SCROLL ===== */
function initNavScroll() {
  var nav = document.getElementById("navbar");
  if (!nav) return;
  var scrolled = false;
  var ticking = false;

  function check() {
    var s = window.scrollY > 50;
    if (s !== scrolled) { scrolled = s; nav.classList.toggle("scrolled", scrolled); }
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(check); ticking = true; }
  }, { passive: true });
  check();
}

/* ===== ACTIVE NAV LINK ===== */
function initActiveNav() {
  var sections = document.querySelectorAll("section[id]");
  var navLinks = document.querySelectorAll(".nav-link");
  if (!sections.length || !navLinks.length) return;

  var ticking = false;

  function update() {
    var scrollPos = window.scrollY + 140;
    sections.forEach(function (section) {
      var top = section.offsetTop;
      var height = section.offsetHeight;
      var id = section.getAttribute("id");
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(function (link) {
          link.classList.remove("active");
          if (link.getAttribute("href") === "#" + id) link.classList.add("active");
        });
      }
    });
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

/* ===== MOBILE NAV ===== */
function initMobileNav() {
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (!toggle || !links) return;

  var navAnchors = links.querySelectorAll("a[href]");

  function setNavAccessibility(open) {
    links.setAttribute("aria-hidden", String(!open));
    navAnchors.forEach(function (a) {
      if (open) a.removeAttribute("tabindex");
      else a.setAttribute("tabindex", "-1");
    });
  }

  setNavAccessibility(false);

  function closeNav() {
    links.classList.remove("open");
    toggle.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
    setNavAccessibility(false);
    document.body.style.overflow = "";
  }

  toggle.addEventListener("click", function () {
    var isOpen = links.classList.toggle("open");
    toggle.classList.toggle("active");
    toggle.setAttribute("aria-expanded", String(isOpen));
    setNavAccessibility(isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) {
      var firstLink = links.querySelector(".nav-link");
      if (firstLink) firstLink.focus();
    }
  });

  links.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function () { closeNav(); toggle.focus(); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && links.classList.contains("open")) {
      closeNav();
      toggle.focus();
    }
    if (e.key === "Tab" && links.classList.contains("open")) {
      var linkItems = Array.prototype.slice.call(links.querySelectorAll("a[href]"));
      var focusable = [toggle].concat(linkItems);
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  links.addEventListener("click", function (e) { if (e.target === links) closeNav(); });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth > 768 && links.classList.contains("open")) closeNav();
    }, 150);
  });
}

/* ===== SMOOTH SCROLL ===== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var id = this.getAttribute("href");
      if (id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });
}

/* ===== CONTACT FORM ===== */
function initContactForm() {
  var form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.querySelector("#name").value;
    var email = form.querySelector("#email").value;
    var message = form.querySelector("#message").value;
    var subject = "Portfolio contact from " + name;
    var body = message + "\n\nFrom: " + name + " (" + email + ")";
    window.location.href = "mailto:roncy516@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".typewrite").forEach(function (el) {
    var toRotate = el.getAttribute("data-type");
    var period = el.getAttribute("data-period");
    if (toRotate) {
      try { new TxtType(el, JSON.parse(toRotate), period); }
      catch (err) { /* skip */ }
    }
  });

  initParticles();
  initTilt();
  initScrollReveal();
  initNavScroll();
  initActiveNav();
  initMobileNav();
  initSmoothScroll();
  initContactForm();
});
