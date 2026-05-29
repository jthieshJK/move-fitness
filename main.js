/* ============================================
   MOVE FITNESS — main.js
   GSAP + ScrollTrigger animations, nav, timetable
   ============================================ */

/* ---- TIMETABLE DATA ---- */
const SCHEDULE = {
  Monday: [
    { time: '7:00 AM', className: 'Reformer Foundations', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Dynamic Flow', instructor: 'Nadira' },
    { time: '5:30 PM', className: 'Core Sculpt', instructor: 'Aisha' },
    { time: '7:00 PM', className: 'Stretch & Restore', instructor: 'Lena' },
  ],
  Tuesday: [
    { time: '7:00 AM', className: 'Core Sculpt', instructor: 'Lena' },
    { time: '9:00 AM', className: 'Reformer Foundations', instructor: 'Nadira' },
    { time: '5:30 PM', className: 'Dynamic Flow', instructor: 'Aisha' },
    { time: '7:00 PM', className: 'Reformer Foundations', instructor: 'Lena' },
  ],
  Wednesday: [
    { time: '7:00 AM', className: 'Dynamic Flow', instructor: 'Nadira' },
    { time: '11:00 AM', className: 'Stretch & Restore', instructor: 'Lena' },
    { time: '5:30 PM', className: 'Core Sculpt', instructor: 'Nadira' },
    { time: '7:00 PM', className: 'Dynamic Flow', instructor: 'Aisha' },
  ],
  Thursday: [
    { time: '7:00 AM', className: 'Reformer Foundations', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Core Sculpt', instructor: 'Lena' },
    { time: '5:30 PM', className: 'Dynamic Flow', instructor: 'Nadira' },
    { time: '7:00 PM', className: 'Stretch & Restore', instructor: 'Aisha' },
  ],
  Friday: [
    { time: '7:00 AM', className: 'Core Sculpt', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Dynamic Flow', instructor: 'Lena' },
    { time: '5:30 PM', className: 'Reformer Foundations', instructor: 'Nadira' },
    { time: '7:00 PM', className: 'Dynamic Flow', instructor: 'Lena' },
  ],
  Saturday: [
    { time: '9:00 AM', className: 'Reformer Foundations', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Duo Session', instructor: 'Lena' },
    { time: '11:00 AM', className: 'Dynamic Flow', instructor: 'Nadira' },
  ],
};

const ALL_TIMES = ['7:00 AM', '9:00 AM', '11:00 AM', '5:30 PM', '7:00 PM'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ---- BUILD DESKTOP TIMETABLE ---- */
function buildDesktopTimetable() {
  const tbody = document.getElementById('timetableBody');
  if (!tbody) return;

  ALL_TIMES.forEach(time => {
    const tr = document.createElement('tr');
    // Time cell
    const timeTd = document.createElement('td');
    timeTd.className = 'timetable__time';
    timeTd.textContent = time;
    tr.appendChild(timeTd);

    DAYS.forEach(day => {
      const td = document.createElement('td');
      // Find all slots at this time for this day
      const slots = (SCHEDULE[day] || []).filter(s => s.time === time);

      if (slots.length === 0) {
        td.innerHTML = '<span class="timetable__empty">—</span>';
      } else {
        slots.forEach(slot => {
          const div = document.createElement('div');
          div.className = 'timetable__cell';
          const encodedClass = encodeURIComponent(slot.className);
          const encodedTime = encodeURIComponent(day.slice(0, 3) + ' ' + time);
          const encodedInstructor = encodeURIComponent(slot.instructor);
          div.innerHTML = `
            <div class="timetable__class-name">${slot.className}</div>
            <div class="timetable__instructor">${slot.instructor}</div>
            <a href="booking.html?class=${encodedClass}&time=${encodedTime}&instructor=${encodedInstructor}" class="timetable__book">Book</a>
          `;
          td.appendChild(div);
        });
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

/* ---- BUILD MOBILE ACCORDION ---- */
function buildMobileAccordion() {
  const container = document.getElementById('timetableAccordion');
  if (!container) return;

  DAYS.forEach(day => {
    const slots = SCHEDULE[day] || [];
    const div = document.createElement('div');
    div.className = 'accordion-day';
    div.innerHTML = `
      <button class="accordion-day__header" aria-expanded="false">
        <span>${day}</span>
        <span class="accordion-day__icon">&#9660;</span>
      </button>
      <div class="accordion-day__body" role="region">
        ${slots.map(slot => {
          const encodedClass = encodeURIComponent(slot.className);
          const encodedTime = encodeURIComponent(day.slice(0, 3) + ' ' + slot.time);
          const encodedInstructor = encodeURIComponent(slot.instructor);
          return `
          <div class="accordion-slot">
            <div class="accordion-slot__info">
              <div class="accordion-slot__time">${slot.time}</div>
              <div class="accordion-slot__class">${slot.className}</div>
              <div class="accordion-slot__instructor">with ${slot.instructor}</div>
            </div>
            <a href="booking.html?class=${encodedClass}&time=${encodedTime}&instructor=${encodedInstructor}" class="btn btn--ghost btn--sm">Book</a>
          </div>
          `;
        }).join('')}
      </div>
    `;

    const header = div.querySelector('.accordion-day__header');
    const body = div.querySelector('.accordion-day__body');

    header.addEventListener('click', () => {
      const isOpen = div.classList.contains('open');
      // Close all
      document.querySelectorAll('.accordion-day').forEach(d => {
        d.classList.remove('open');
        d.querySelector('.accordion-day__header').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        div.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
      }
    });

    container.appendChild(div);
  });
}

/* ---- NAVBAR SCROLL BEHAVIOR ---- */
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastY = y;
  }, { passive: true });
}

/* ---- MOBILE MENU ---- */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('navOverlay');
  const closeBtn = document.getElementById('drawerClose');
  if (!hamburger || !drawer) return;

  function openMenu() {
    drawer.classList.add('open');
    overlay.classList.add('visible');
    hamburger.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    drawer.classList.remove('open');
    overlay.classList.remove('visible');
    hamburger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  drawer.querySelectorAll('.nav__drawer-link, .nav__drawer-cta').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
}

/* ---- GSAP ANIMATIONS ---- */
function initAnimations() {
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  /* Hero — sequential reveal */
  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTL
    .to('#heroEyebrow', { opacity: 1, y: 0, duration: 0.8, delay: 0.2 })
    .fromTo('#heroHeading',
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' },
      '-=0.4'
    )
    .to('#heroSub', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
    .to('#heroActions', { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
    .to('#heroScroll', { opacity: 1, duration: 0.6 }, '-=0.2');

  /* Set initial hero states */
  gsap.set('#heroEyebrow', { y: 20 });
  gsap.set('#heroSub', { y: 20 });
  gsap.set('#heroActions', { y: 20 });

  /* Section headings */
  document.querySelectorAll('[data-scroll-reveal="up"] .section-heading, [data-scroll-reveal="up"]').forEach(el => {
    gsap.fromTo(el,
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  /* Text left / right slide */
  document.querySelectorAll('[data-scroll-reveal="left"]').forEach(el => {
    gsap.fromTo(el,
      { x: -50, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
      }
    );
  });

  document.querySelectorAll('[data-scroll-reveal="right"]').forEach(el => {
    gsap.fromTo(el,
      { x: 50, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
      }
    );
  });

  /* Class cards — stagger from bottom */
  const classCards = document.querySelectorAll('[data-scroll-card]');
  if (classCards.length) {
    /* Group cards by parent section for per-section staggering */
    const sections = new Map();
    classCards.forEach(card => {
      const parent = card.closest('section');
      if (!sections.has(parent)) sections.set(parent, []);
      sections.get(parent).push(card);
    });

    sections.forEach((cards, section) => {
      gsap.fromTo(cards,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  }

  /* Testimonials — with slight rotation */
  const testimonials = document.querySelectorAll('.testimonial-card');
  if (testimonials.length) {
    gsap.fromTo(testimonials,
      { y: 30, opacity: 0, rotation: 2 },
      {
        y: 0, opacity: 1, rotation: 0,
        duration: 0.8, stagger: 0.15, ease: 'power2.out',
        scrollTrigger: {
          trigger: '.testimonials__grid',
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  /* Pricing cards — scale in */
  const pricingCards = document.querySelectorAll('.pricing-card');
  if (pricingCards.length) {
    gsap.fromTo(pricingCards,
      { scale: 0.95, opacity: 0 },
      {
        scale: 1, opacity: 1,
        duration: 0.7, stagger: 0.15, ease: 'back.out(1.2)',
        scrollTrigger: {
          trigger: '.pricing__grid',
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
    /* Re-apply featured scale after GSAP is done */
    const featured = document.querySelector('.pricing-card--featured');
    if (featured) {
      ScrollTrigger.create({
        trigger: '.pricing__grid',
        start: 'top 88%',
        onEnter: () => {
          gsap.to(featured, { scale: 1.04, delay: 0.45, duration: 0.3 });
        },
        once: true
      });
    }
  }

  /* Timetable */
  gsap.fromTo('#timetable',
    { y: 30, opacity: 0 },
    {
      y: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
      scrollTrigger: {
        trigger: '#schedule',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    }
  );

  /* Instructor cards */
  const instructorCards = document.querySelectorAll('.instructor-card');
  if (instructorCards.length) {
    gsap.fromTo(instructorCards,
      { y: 40, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.7, stagger: 0.15, ease: 'power2.out',
        scrollTrigger: {
          trigger: '.instructors__grid',
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  /* CTA strip */
  gsap.fromTo('.cta-strip__inner',
    { y: 30, opacity: 0 },
    {
      y: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
      scrollTrigger: {
        trigger: '.cta-strip',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    }
  );
}

/* ---- SMOOTH ANCHOR SCROLLING ---- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  buildDesktopTimetable();
  buildMobileAccordion();
  initNav();
  initMobileMenu();
  initSmoothScroll();

  // Wait for GSAP to load
  function tryInit() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      initAnimations();
    } else {
      setTimeout(tryInit, 100);
    }
  }
  tryInit();
});
