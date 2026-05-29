/* ============================================================
   MOVE FITNESS — Admin Dashboard
   admin.js — live-data edition, in-memory auth
   ============================================================ */

'use strict';

// ── CONFIG ──────────────────────────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzSmwOqTma1Ah2aopU0x61Km3q2XXmxOCXt3IQ8AVBsE17s9PEt6f-6szQw8ClDAwBk/exec';
const ADMIN_PASSWORD  = '6466';
const MAX_CAPACITY    = 8;

// Class prices (for revenue display only — server also computes this)
const CLASS_PRICES = {
  'Reformer Foundations': 85,
  'Dynamic Flow':          95,
  'Core Sculpt':           90,
  'Stretch & Restore':     80,
  'Private Session':      220,
  'Duo Session':          160,
};

// Full weekly timetable — matches booking.js
const TIMETABLE = {
  Mon: [
    { time: '7:00 AM',  cls: 'Reformer Foundations', instructor: 'Sarah Lim' },
    { time: '9:00 AM',  cls: 'Core Sculpt',           instructor: 'Aina Razak' },
    { time: '5:30 PM',  cls: 'Dynamic Flow',           instructor: 'Sarah Lim' },
    { time: '7:00 PM',  cls: 'Stretch & Restore',      instructor: 'Priya Nair' },
  ],
  Tue: [
    { time: '7:00 AM',  cls: 'Dynamic Flow',           instructor: 'Marcus Tan' },
    { time: '11:00 AM', cls: 'Stretch & Restore',      instructor: 'Priya Nair' },
    { time: '7:00 PM',  cls: 'Reformer Foundations',   instructor: 'Sarah Lim' },
  ],
  Wed: [
    { time: '7:00 AM',  cls: 'Core Sculpt',            instructor: 'Aina Razak' },
    { time: '9:00 AM',  cls: 'Reformer Foundations',   instructor: 'Marcus Tan' },
    { time: '5:30 PM',  cls: 'Dynamic Flow',            instructor: 'Marcus Tan' },
    { time: '7:00 PM',  cls: 'Core Sculpt',             instructor: 'Aina Razak' },
  ],
  Thu: [
    { time: '7:00 AM',  cls: 'Stretch & Restore',      instructor: 'Priya Nair' },
    { time: '9:00 AM',  cls: 'Dynamic Flow',            instructor: 'Sarah Lim' },
    { time: '7:00 PM',  cls: 'Reformer Foundations',   instructor: 'Marcus Tan' },
  ],
  Fri: [
    { time: '7:00 AM',  cls: 'Dynamic Flow',            instructor: 'Sarah Lim' },
    { time: '9:00 AM',  cls: 'Core Sculpt',             instructor: 'Aina Razak' },
    { time: '5:30 PM',  cls: 'Reformer Foundations',   instructor: 'Marcus Tan' },
    { time: '7:00 PM',  cls: 'Stretch & Restore',       instructor: 'Priya Nair' },
  ],
  Sat: [
    { time: '8:00 AM',  cls: 'Reformer Foundations',   instructor: 'Sarah Lim' },
    { time: '10:00 AM', cls: 'Dynamic Flow',            instructor: 'Marcus Tan' },
    { time: '12:00 PM', cls: 'Stretch & Restore',      instructor: 'Priya Nair' },
  ],
  Sun: [
    { time: '9:00 AM',  cls: 'Core Sculpt',             instructor: 'Aina Razak' },
    { time: '11:00 AM', cls: 'Stretch & Restore',      instructor: 'Priya Nair' },
  ],
};

// Day order for schedule table
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

// ── STATE ────────────────────────────────────────────────────
let isLoggedIn   = false;
let allBookings  = [];       // full bookings array from API
let activeTab    = 'overview';

// ── DOM REFS ─────────────────────────────────────────────────
const gate          = document.getElementById('gate');
const dash          = document.getElementById('dash');
const pwInput       = document.getElementById('pwInput');
const gateBtn       = document.getElementById('gateBtn');
const gateError     = document.getElementById('gateError');
const loadBar       = document.getElementById('loadBar');
const refreshBtn    = document.getElementById('refreshBtn');
const topbarRefresh = document.getElementById('topbarRefresh');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar       = document.getElementById('sidebar');
const mobOverlay    = document.getElementById('mobOverlay');
const topbarTitle   = document.getElementById('topbarTitle');
const logoutBtn     = document.getElementById('logoutBtn');
const apiStatus     = document.getElementById('apiStatus');
const overviewDate  = document.getElementById('overviewDate');
const bookingBadge  = document.getElementById('bookingBadge');

// Tab sections & nav buttons
const tabs    = document.querySelectorAll('.tab');
const navBtns = document.querySelectorAll('.nav-item[data-tab]');

// Overview
const svToday = document.getElementById('sv-today');
const svMonth = document.getElementById('sv-month');
const svRev   = document.getElementById('sv-rev');
const svPop   = document.getElementById('sv-pop');
const barChartWrap = document.getElementById('barChartWrap');
const todayList    = document.getElementById('todayList');
const todayCount   = document.getElementById('todayCount');

// Bookings
const bookingSearch  = document.getElementById('bookingSearch');
const statusFilter   = document.getElementById('statusFilter');
const bookingsCard   = document.getElementById('bookingsTableCard');
const bookingsEmpty  = document.getElementById('bookingsEmpty');

// Schedule
const scheduleWrap = document.getElementById('scheduleWrap');

// ============================================================
//  PASSWORD GATE
// ============================================================
function tryLogin() {
  const val = pwInput.value.trim();
  if (val === ADMIN_PASSWORD) {
    isLoggedIn = true;
    gate.style.opacity = '0';
    gate.style.transition = 'opacity 0.35s ease';
    setTimeout(() => {
      gate.style.display = 'none';
      dash.classList.remove('hidden');
      gsap.from('.sidebar', { x: -20, opacity: 0, duration: 0.4, ease: 'power2.out' });
      gsap.from('.tab.active', { y: 12, opacity: 0, duration: 0.45, delay: 0.1, ease: 'power2.out' });
      setOverviewDate();
      fetchAll();
    }, 350);
  } else {
    gateError.textContent = 'Incorrect password. Try again.';
    pwInput.value = '';
    pwInput.focus();
    pwInput.style.borderColor = 'var(--red)';
    setTimeout(() => {
      pwInput.style.borderColor = '';
      gateError.textContent = '';
    }, 2000);
  }
}

gateBtn.addEventListener('click', tryLogin);
pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

// ============================================================
//  TAB SWITCHING
// ============================================================
function switchTab(tabName) {
  activeTab = tabName;

  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  tabs.forEach(section => {
    const isTarget = section.id === 'tab-' + tabName;
    section.classList.toggle('active', isTarget);
    section.classList.toggle('hidden', !isTarget);
    if (isTarget) {
      gsap.from(section, { y: 8, opacity: 0, duration: 0.3, ease: 'power2.out' });
    }
  });

  // Update mobile topbar title
  const labels = { overview: 'Overview', bookings: 'Bookings', schedule: 'Schedule', settings: 'Settings' };
  topbarTitle.textContent = labels[tabName] || tabName;

  // Close mobile sidebar
  closeSidebar();
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================================
//  MOBILE SIDEBAR
// ============================================================
function openSidebar() {
  sidebar.classList.add('open');
  mobOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  mobOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

sidebarToggle.addEventListener('click', openSidebar);
mobOverlay.addEventListener('click', closeSidebar);

// ============================================================
//  LOADING BAR
// ============================================================
function startLoad() {
  loadBar.classList.add('loading');
  if (refreshBtn)    refreshBtn.classList.add('spinning');
  if (topbarRefresh) topbarRefresh.classList.add('spinning');
}

function stopLoad() {
  loadBar.classList.remove('loading');
  if (refreshBtn)    refreshBtn.classList.remove('spinning');
  if (topbarRefresh) topbarRefresh.classList.remove('spinning');
}

// ============================================================
//  FETCH — BOTH ENDPOINTS IN PARALLEL
// ============================================================
async function fetchAll() {
  if (!isLoggedIn) return;
  startLoad();

  try {
    const [statsRes, bookingsRes] = await Promise.all([
      fetch(APPS_SCRIPT_URL + '?action=getStats',    { cache: 'no-store' }),
      fetch(APPS_SCRIPT_URL + '?action=getBookings', { cache: 'no-store' }),
    ]);

    const statsJson    = await statsRes.json();
    const bookingsJson = await bookingsRes.json();

    if (statsJson.status === 'success') {
      renderStats(statsJson);
      renderBarChart(statsJson.weekCounts);
      renderTodayList(statsJson.todayClasses || []);
    }

    if (bookingsJson.status === 'success') {
      allBookings = bookingsJson.bookings || [];
      renderBookingsTable(allBookings);
      renderSchedule(allBookings);
      updateBookingBadge(allBookings.length);
    }

    // Mark API as connected
    if (apiStatus) {
      apiStatus.textContent = 'Connected';
      apiStatus.classList.add('ok');
      apiStatus.classList.remove('err');
    }

  } catch (err) {
    console.error('Fetch error:', err);
    if (apiStatus) {
      apiStatus.textContent = 'Connection failed';
      apiStatus.classList.add('err');
      apiStatus.classList.remove('ok');
    }
    renderFallback();
  } finally {
    stopLoad();
  }
}

function renderFallback() {
  // Show empty states gracefully if API fails
  if (svToday) svToday.textContent = '—';
  if (svMonth) svMonth.textContent = '—';
  if (svRev)   svRev.textContent   = '—';
  if (svPop)   svPop.textContent   = '—';

  barChartWrap.innerHTML = '<p style="padding:1.5rem;font-size:0.8rem;color:var(--faint);text-align:center;">Unable to load chart data.</p>';
  todayList.innerHTML    = '<p class="today-empty">Could not load today\'s classes. Check your Apps Script URL.</p>';
  bookingsCard.innerHTML = '<p style="padding:2rem;text-align:center;font-size:0.85rem;color:var(--faint);">Unable to load bookings. Check your Apps Script deployment.</p>';
  scheduleWrap.innerHTML = buildScheduleTable({});
}

// ============================================================
//  OVERVIEW — STAT CARDS
// ============================================================
function renderStats(stats) {
  // Remove skeleton shimmer from cards
  document.querySelectorAll('.stat-card.skeleton').forEach(c => c.classList.remove('skeleton'));

  animateCount(svToday, stats.todayCount  || 0);
  animateCount(svMonth, stats.monthCount  || 0);

  const rev = stats.monthRevenue || 0;
  svRev.textContent = 'RM ' + rev.toLocaleString('en-MY');

  svPop.textContent = stats.mostPopular || 'N/A';

  // Today count badge on card header
  if (todayCount) todayCount.textContent = (stats.todayCount || 0) + ' booked';
}

function animateCount(el, target) {
  if (!el) return;
  const start = 0;
  const duration = 800;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
//  OVERVIEW — BAR CHART
// ============================================================
function renderBarChart(weekCounts) {
  if (!barChartWrap || !weekCounts) return;

  const days   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = days.map(d => weekCounts[d] || 0);
  const maxVal = Math.max(...values, 1);

  barChartWrap.innerHTML = '';
  const chart = document.createElement('div');
  chart.className = 'bar-chart';

  days.forEach((day, i) => {
    const val   = values[i];
    const pct   = (val / maxVal) * 100;

    const col = document.createElement('div');
    col.className = 'bar-col';

    const valEl = document.createElement('div');
    valEl.className = 'bar-col__val';
    valEl.textContent = val > 0 ? val : '';

    const barWrap = document.createElement('div');
    barWrap.className = 'bar-col__bar-wrap';

    const bar = document.createElement('div');
    bar.className = 'bar-col__bar' + (val === 0 ? ' bar-col__bar--zero' : '');
    bar.style.height = '0%';

    const lbl = document.createElement('div');
    lbl.className = 'bar-col__lbl';
    lbl.textContent = day;

    barWrap.appendChild(bar);
    col.appendChild(valEl);
    col.appendChild(barWrap);
    col.appendChild(lbl);
    chart.appendChild(col);

    // Animate bars in after render
    setTimeout(() => {
      bar.style.height = Math.max(pct, val > 0 ? 4 : 2) + '%';
    }, 80 + i * 60);
  });

  barChartWrap.appendChild(chart);
}

// ============================================================
//  OVERVIEW — TODAY'S CLASSES
// ============================================================
function renderTodayList(todayClasses) {
  if (!todayList) return;

  if (!todayClasses || todayClasses.length === 0) {
    todayList.innerHTML = '<p class="today-empty">No classes booked for today.</p>';
    return;
  }

  // Sort by time order
  const timeOrder = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','5:30 PM','7:00 PM'];
  const sorted = [...todayClasses].sort((a, b) => {
    const ai = timeOrder.indexOf(a.time);
    const bi = timeOrder.indexOf(b.time);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  todayList.innerHTML = sorted.map(cls => `
    <div class="today-row">
      <div class="today-time">${escHtml(cls.time)}</div>
      <div class="today-info">
        <div class="today-class">${escHtml(cls.className)}</div>
        <div class="today-detail">${escHtml(cls.instructor)} · ${escHtml(cls.name)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  BOOKINGS TABLE
// ============================================================
function renderBookingsTable(bookings) {
  if (!bookingsCard) return;

  if (!bookings || bookings.length === 0) {
    bookingsCard.innerHTML = '';
    bookingsEmpty.classList.remove('hidden');
    return;
  }

  bookingsEmpty.classList.add('hidden');

  const sorted = [...bookings].sort((a, b) => b.id - a.id); // newest first

  const tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Booking ID</th>
          <th>Client</th>
          <th>Class</th>
          <th>Date</th>
          <th>Time</th>
          <th>Instructor</th>
          <th>Status</th>
          <th>Booked On</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((b, idx) => `
          <tr data-name="${escHtml((b.name||'').toLowerCase())}"
              data-class="${escHtml((b.className||'').toLowerCase())}"
              data-instructor="${escHtml((b.instructor||'').toLowerCase())}"
              data-status="${escHtml(b.status||'')}">
            <td class="td-num">${sorted.length - idx}</td>
            <td class="td-id">${escHtml(b.bookingId || '—')}</td>
            <td>
              <div class="td-name">${escHtml(b.name || '—')}</div>
              <div style="font-size:0.7rem;color:var(--muted);">${escHtml(b.email || '')}</div>
            </td>
            <td>${escHtml(b.className || '—')}</td>
            <td style="white-space:nowrap;">${escHtml(b.date || '—')}</td>
            <td style="white-space:nowrap;">${escHtml(b.time || '—')}</td>
            <td>${escHtml(b.instructor || '—')}</td>
            <td>${statusPill(b.status)}</td>
            <td style="font-size:0.72rem;color:var(--muted);">${escHtml(b.timestamp || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  bookingsCard.innerHTML = tableHtml;
  applyBookingFilter();
}

function updateBookingBadge(count) {
  if (!bookingBadge) return;
  if (count > 0) {
    bookingBadge.textContent = count;
    bookingBadge.classList.add('visible');
  } else {
    bookingBadge.classList.remove('visible');
  }
}

function statusPill(status) {
  const s = (status || 'Pending').toLowerCase();
  const cls = s === 'confirmed' ? 'pill--confirmed'
            : s === 'cancelled' ? 'pill--cancelled'
            : s === 'completed' ? 'pill--completed'
            : 'pill--pending';
  return `<span class="pill ${cls}">${escHtml(status || 'Pending')}</span>`;
}

// ── Search + Filter ──────────────────────────────────────────
function applyBookingFilter() {
  const query  = (bookingSearch?.value  || '').toLowerCase().trim();
  const status = (statusFilter?.value   || '').toLowerCase().trim();

  const rows = bookingsCard.querySelectorAll('tbody tr');
  let visible = 0;

  rows.forEach(row => {
    const name       = row.dataset.name       || '';
    const cls        = row.dataset.class      || '';
    const instructor = row.dataset.instructor || '';
    const rowStatus  = (row.dataset.status || '').toLowerCase();

    const matchQuery  = !query  || name.includes(query) || cls.includes(query) || instructor.includes(query);
    const matchStatus = !status || rowStatus === status;

    if (matchQuery && matchStatus) {
      row.classList.remove('hidden-row');
      visible++;
    } else {
      row.classList.add('hidden-row');
    }
  });

  if (bookingsEmpty) {
    bookingsEmpty.classList.toggle('hidden', visible > 0);
  }
}

if (bookingSearch) bookingSearch.addEventListener('input', applyBookingFilter);
if (statusFilter)  statusFilter.addEventListener('change', applyBookingFilter);

// ============================================================
//  SCHEDULE TAB — live capacity from bookings data
// ============================================================
function renderSchedule(bookings) {
  if (!scheduleWrap) return;
  scheduleWrap.innerHTML = buildScheduleTable(bookings);
}

function buildScheduleTable(bookings) {
  // Count bookings per (day, time, class)
  const bookingMap = {}; // key: "Mon|9:00 AM|Core Sculpt" → count

  if (Array.isArray(bookings)) {
    bookings.forEach(b => {
      if (!b.date || !b.time || !b.className) return;
      if ((b.status || '').toLowerCase() === 'cancelled') return;

      // Parse the date string to get day abbreviation
      const parsed = new Date(b.date);
      if (isNaN(parsed)) return;
      const abbrs = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayAbbr = abbrs[parsed.getDay()];

      const key = `${dayAbbr}|${b.time}|${b.className}`;
      bookingMap[key] = (bookingMap[key] || 0) + 1;
    });
  }

  // Collect all unique times across all days
  const allTimes = [];
  DAY_ORDER.forEach(day => {
    (TIMETABLE[day] || []).forEach(slot => {
      if (!allTimes.includes(slot.time)) allTimes.push(slot.time);
    });
  });

  // Sort times
  const timeOrder = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','5:30 PM','7:00 PM'];
  allTimes.sort((a, b) => {
    const ai = timeOrder.indexOf(a);
    const bi = timeOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  let html = `<table class="sched-table">
    <thead>
      <tr>
        <th class="time-col">Time</th>
        ${DAY_ORDER.map(d => `<th>${DAY_LABELS[d]}</th>`).join('')}
      </tr>
    </thead>
    <tbody>`;

  allTimes.forEach(time => {
    html += `<tr><td class="sched-time">${escHtml(time)}</td>`;

    DAY_ORDER.forEach(day => {
      html += `<td>`;
      const slots = (TIMETABLE[day] || []).filter(s => s.time === time);

      if (slots.length === 0) {
        html += `<span class="sched-empty">—</span>`;
      } else {
        slots.forEach(slot => {
          const key   = `${day}|${slot.time}|${slot.cls}`;
          const booked = bookingMap[key] || 0;
          const remain = MAX_CAPACITY - booked;
          const capClass = booked === 0    ? 'cap-low'
                         : remain <= 2    ? 'cap-full'
                         : remain <= 4    ? 'cap-mid'
                         : 'cap-low';

          html += `
            <div class="sched-slot ${capClass}">
              <div class="sched-slot__cls">${escHtml(slot.cls)}</div>
              <div class="sched-slot__det">${escHtml(slot.instructor)}</div>
              <div class="sched-slot__live">${booked}/${MAX_CAPACITY} booked</div>
            </div>`;
        });
      }

      html += `</td>`;
    });

    html += `</tr>`;
  });

  html += '</tbody></table>';
  return html;
}

// ============================================================
//  SETTINGS — API STATUS CHECK
// ============================================================
async function checkApiStatus() {
  if (!apiStatus) return;
  apiStatus.textContent = 'Checking…';
  apiStatus.className = 'info-val api-status';

  try {
    const res  = await fetch(APPS_SCRIPT_URL, { cache: 'no-store' });
    const json = await res.json();
    if (json.status === 'ok') {
      apiStatus.textContent = 'Connected';
      apiStatus.classList.add('ok');
    } else {
      throw new Error(json.message || 'Unexpected response');
    }
  } catch (err) {
    apiStatus.textContent = 'Connection failed — check deployment';
    apiStatus.classList.add('err');
  }
}

// ============================================================
//  LOGOUT
// ============================================================
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    isLoggedIn = false;
    allBookings = [];
    dash.classList.add('hidden');
    gate.style.display = '';
    gate.style.opacity = '1';
    pwInput.value = '';
    gateError.textContent = '';
    // Reset UI
    [svToday, svMonth, svRev, svPop].forEach(el => { if (el) el.textContent = '—'; });
  });
}

// ============================================================
//  REFRESH BUTTON
// ============================================================
function handleRefresh() {
  if (!isLoggedIn) return;
  fetchAll();
}

if (refreshBtn)    refreshBtn.addEventListener('click', handleRefresh);
if (topbarRefresh) topbarRefresh.addEventListener('click', handleRefresh);

// ============================================================
//  OVERVIEW DATE STAMP
// ============================================================
function setOverviewDate() {
  if (!overviewDate) return;
  const now = new Date();
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  overviewDate.textContent = now.toLocaleDateString('en-MY', opts);
}

// ============================================================
//  HELPERS
// ============================================================
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
//  INIT — auto-check API in settings when tab opens
// ============================================================
navBtns.forEach(btn => {
  if (btn.dataset.tab === 'settings') {
    btn.addEventListener('click', () => {
      setTimeout(checkApiStatus, 200);
    });
  }
});

// Focus password input on page load
window.addEventListener('DOMContentLoaded', () => {
  pwInput.focus();
});
