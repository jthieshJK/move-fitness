/* ============================================
   MOVE FITNESS — admin.js
   Password gate, tab switching, bookings table, schedule
   ============================================ */

const ADMIN_PASSWORD = '6466';

// In-memory login state (no sessionStorage in preview iframe)
let isLoggedIn = false;

/* ---- MOCK BOOKINGS DATA ---- */
const MOCK_BOOKINGS = [
  { id: 1, name: 'Priya Menon',       cls: 'Dynamic Flow',          date: '29 May 2026', time: '7:00 AM', instructor: 'Aisha',  status: 'Confirmed' },
  { id: 2, name: 'Siti Rahimah',      cls: 'Reformer Foundations',  date: '29 May 2026', time: '9:00 AM', instructor: 'Nadira', status: 'Confirmed' },
  { id: 3, name: 'Marcus Lee',        cls: 'Dynamic Flow',          date: '28 May 2026', time: '7:00 AM', instructor: 'Lena',   status: 'Confirmed' },
  { id: 4, name: 'Amirah Shahidan',   cls: 'Core Sculpt',           date: '28 May 2026', time: '5:30 PM', instructor: 'Aisha',  status: 'Confirmed' },
  { id: 5, name: 'Raj Kumar',         cls: 'Private Session',       date: '27 May 2026', time: '11:00 AM',instructor: 'Nadira', status: 'Confirmed' },
  { id: 6, name: 'Nurul Izzati',      cls: 'Stretch & Restore',     date: '27 May 2026', time: '7:00 PM', instructor: 'Lena',   status: 'Cancelled' },
  { id: 7, name: 'Chen Wei Ling',     cls: 'Reformer Foundations',  date: '26 May 2026', time: '7:00 AM', instructor: 'Aisha',  status: 'Confirmed' },
  { id: 8, name: 'Dhruv Patel',       cls: 'Dynamic Flow',          date: '26 May 2026', time: '9:00 AM', instructor: 'Lena',   status: 'Pending'   },
  { id: 9, name: 'Farah Nadirah',     cls: 'Core Sculpt',           date: '25 May 2026', time: '9:00 AM', instructor: 'Lena',   status: 'Confirmed' },
  { id:10, name: 'Kevin Tan',         cls: 'Duo Session',           date: '24 May 2026', time: '9:00 AM', instructor: 'Lena',   status: 'Confirmed' },
  { id:11, name: 'Yogeswari Nathan',  cls: 'Stretch & Restore',     date: '23 May 2026', time: '11:00 AM',instructor: 'Lena',   status: 'Confirmed' },
  { id:12, name: 'Hafiz Rahman',      cls: 'Reformer Foundations',  date: '23 May 2026', time: '7:00 PM', instructor: 'Lena',   status: 'Cancelled' },
];

/* ---- ADMIN SCHEDULE DATA ---- */
const ADMIN_SCHEDULE = {
  Monday:    [
    { time: '7:00 AM',  cls: 'Reformer Foundations', inst: 'Aisha',  cap: 5 },
    { time: '9:00 AM',  cls: 'Dynamic Flow',          inst: 'Nadira', cap: 7 },
    { time: '5:30 PM',  cls: 'Core Sculpt',           inst: 'Aisha',  cap: 6 },
    { time: '7:00 PM',  cls: 'Stretch & Restore',     inst: 'Lena',   cap: 3 },
  ],
  Tuesday:   [
    { time: '7:00 AM',  cls: 'Core Sculpt',           inst: 'Lena',   cap: 4 },
    { time: '9:00 AM',  cls: 'Reformer Foundations',  inst: 'Nadira', cap: 8 },
    { time: '5:30 PM',  cls: 'Dynamic Flow',          inst: 'Aisha',  cap: 7 },
    { time: '7:00 PM',  cls: 'Reformer Foundations',  inst: 'Lena',   cap: 2 },
  ],
  Wednesday: [
    { time: '7:00 AM',  cls: 'Dynamic Flow',          inst: 'Nadira', cap: 6 },
    { time: '11:00 AM', cls: 'Stretch & Restore',     inst: 'Lena',   cap: 5 },
    { time: '5:30 PM',  cls: 'Core Sculpt',           inst: 'Nadira', cap: 7 },
    { time: '7:00 PM',  cls: 'Dynamic Flow',          inst: 'Aisha',  cap: 8 },
  ],
  Thursday:  [
    { time: '7:00 AM',  cls: 'Reformer Foundations',  inst: 'Aisha',  cap: 3 },
    { time: '9:00 AM',  cls: 'Core Sculpt',           inst: 'Lena',   cap: 6 },
    { time: '5:30 PM',  cls: 'Dynamic Flow',          inst: 'Nadira', cap: 5 },
    { time: '7:00 PM',  cls: 'Stretch & Restore',     inst: 'Aisha',  cap: 4 },
  ],
  Friday:    [
    { time: '7:00 AM',  cls: 'Core Sculpt',           inst: 'Aisha',  cap: 7 },
    { time: '9:00 AM',  cls: 'Dynamic Flow',          inst: 'Lena',   cap: 8 },
    { time: '5:30 PM',  cls: 'Reformer Foundations',  inst: 'Nadira', cap: 6 },
    { time: '7:00 PM',  cls: 'Dynamic Flow',          inst: 'Lena',   cap: 5 },
  ],
  Saturday:  [
    { time: '9:00 AM',  cls: 'Reformer Foundations',  inst: 'Aisha',  cap: 6 },
    { time: '9:00 AM',  cls: 'Duo Session',           inst: 'Lena',   cap: 2 },
    { time: '11:00 AM', cls: 'Dynamic Flow',          inst: 'Nadira', cap: 7 },
  ],
};
const ALL_TIMES = ['7:00 AM', '9:00 AM', '11:00 AM', '5:30 PM', '7:00 PM'];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---- PASSWORD GATE ---- */
function initPasswordGate() {
  if (isLoggedIn) {
    showDashboard(false);
    return;
  }

  const gate = document.getElementById('passwordGate');
  const input = document.getElementById('passwordInput');
  const enterBtn = document.getElementById('enterBtn');
  const errorEl = document.getElementById('passwordError');

  function tryLogin() {
    if (input.value === ADMIN_PASSWORD) {
      isLoggedIn = true;
      showDashboard(true);
    } else {
      errorEl.textContent = 'Incorrect password. Please try again.';
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(document.getElementById('passwordField'),
          { x: -8 },
          { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)', clearProps: 'x' }
        );
        gsap.fromTo(document.getElementById('passwordField'),
          {},
          { x: [-8, 8, -6, 6, -4, 0], duration: 0.4 }
        );
      }
      input.value = '';
      input.focus();
    }
  }

  enterBtn.addEventListener('click', tryLogin);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
}

function showDashboard(animate) {
  const gate = document.getElementById('passwordGate');
  const dash = document.getElementById('dashboard');

  if (animate && typeof gsap !== 'undefined') {
    gsap.to(gate, {
      opacity: 0, duration: 0.5, ease: 'power2.in',
      onComplete: () => {
        gate.style.display = 'none';
        dash.classList.remove('hidden');
        gsap.from(dash, { opacity: 0, duration: 0.4 });
      }
    });
  } else {
    gate.style.display = 'none';
    dash.classList.remove('hidden');
  }
}

/* ---- TAB SWITCHING ---- */
function initTabs() {
  const navItems = document.querySelectorAll('.sidebar__nav-item');
  const mobileTitle = document.getElementById('mobileTitle');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
      const tabEl = document.getElementById(`tab-${tab}`);
      if (tabEl) tabEl.classList.remove('hidden');

      if (mobileTitle) mobileTitle.textContent = item.textContent.trim();

      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
      document.querySelector('.sidebar-overlay')?.classList.remove('visible');
    });
  });
}

/* ---- MOBILE SIDEBAR ---- */
function initMobileSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
}

/* ---- BOOKINGS TABLE ---- */
function buildBookingsTable() {
  const tbody = document.getElementById('bookingsTbody');
  if (!tbody) return;

  MOCK_BOOKINGS.forEach(b => {
    const statusClass = b.status === 'Confirmed' ? 'status--confirmed'
      : b.status === 'Pending' ? 'status--pending' : 'status--cancelled';
    const tr = document.createElement('tr');
    tr.setAttribute('data-name', b.name.toLowerCase());
    tr.setAttribute('data-cls', b.cls.toLowerCase());
    tr.innerHTML = `
      <td class="row-num">${b.id}</td>
      <td class="client-name">${b.name}</td>
      <td>${b.cls}</td>
      <td>${b.date}</td>
      <td>${b.time}</td>
      <td>${b.instructor}</td>
      <td><span class="status-pill ${statusClass}">${b.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function initBookingSearch() {
  const input = document.getElementById('bookingSearch');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('#bookingsTbody tr').forEach(row => {
      const name = row.getAttribute('data-name') || '';
      const cls = row.getAttribute('data-cls') || '';
      const match = name.includes(q) || cls.includes(q);
      row.classList.toggle('hidden-row', !match);
    });
  });
}

/* ---- ADMIN SCHEDULE GRID ---- */
function buildAdminSchedule() {
  const container = document.getElementById('adminScheduleGrid');
  if (!container) return;

  const grid = document.createElement('div');
  grid.className = 'admin-schedule-grid';

  // Header row
  const th0 = document.createElement('div');
  th0.className = 'admin-sched-header time-col';
  th0.textContent = 'Time';
  grid.appendChild(th0);

  DAYS.forEach(day => {
    const th = document.createElement('div');
    th.className = 'admin-sched-header';
    th.textContent = day;
    grid.appendChild(th);
  });

  // Time rows
  ALL_TIMES.forEach(time => {
    const timeTd = document.createElement('div');
    timeTd.className = 'admin-sched-time';
    timeTd.textContent = time;
    grid.appendChild(timeTd);

    DAYS.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'admin-sched-cell';

      const slots = (ADMIN_SCHEDULE[day] || []).filter(s => s.time === time);
      if (slots.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'admin-sched-empty';
        empty.textContent = '—';
        cell.appendChild(empty);
      } else {
        slots.forEach(slot => {
          const slotEl = document.createElement('div');
          const capClass = slot.cap >= 8 ? 'cap--full' : slot.cap >= 6 ? 'cap--mid' : 'cap--low';
          slotEl.className = `admin-sched-slot ${capClass}`;
          slotEl.innerHTML = `
            <div class="admin-sched-slot__class">${slot.cls}</div>
            <div class="admin-sched-slot__detail">${slot.inst} · ${slot.cap}/8</div>
          `;
          cell.appendChild(slotEl);
        });
      }
      grid.appendChild(cell);
    });
  });

  container.appendChild(grid);
}

/* ---- ADMIN DATE ---- */
function setAdminDate() {
  const el = document.getElementById('adminDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---- LOGOUT ---- */
function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    isLoggedIn = false;
    location.reload();
  });
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  initPasswordGate();
  initTabs();
  initMobileSidebar();
  buildBookingsTable();
  initBookingSearch();
  buildAdminSchedule();
  setAdminDate();
  initLogout();
});
