/* ============================================
   MOVE FITNESS — booking.js
   Booking flow: step navigation, calendar, form, API
   ============================================ */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzSmwOqTma1Ah2aopU0x61Km3q2XXmxOCXt3IQ8AVBsE17s9PEt6f-6szQw8ClDAwBk/exec";

/* ---- TIMETABLE (mirrors main.js) ---- */
const SCHEDULE = {
  Monday:    [
    { time: '7:00 AM', className: 'Reformer Foundations', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Dynamic Flow', instructor: 'Nadira' },
    { time: '5:30 PM', className: 'Core Sculpt', instructor: 'Aisha' },
    { time: '7:00 PM', className: 'Stretch & Restore', instructor: 'Lena' },
  ],
  Tuesday:   [
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
  Thursday:  [
    { time: '7:00 AM', className: 'Reformer Foundations', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Core Sculpt', instructor: 'Lena' },
    { time: '5:30 PM', className: 'Dynamic Flow', instructor: 'Nadira' },
    { time: '7:00 PM', className: 'Stretch & Restore', instructor: 'Aisha' },
  ],
  Friday:    [
    { time: '7:00 AM', className: 'Core Sculpt', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Dynamic Flow', instructor: 'Lena' },
    { time: '5:30 PM', className: 'Reformer Foundations', instructor: 'Nadira' },
    { time: '7:00 PM', className: 'Dynamic Flow', instructor: 'Lena' },
  ],
  Saturday:  [
    { time: '9:00 AM', className: 'Reformer Foundations', instructor: 'Aisha' },
    { time: '9:00 AM', className: 'Duo Session', instructor: 'Lena' },
    { time: '11:00 AM', className: 'Dynamic Flow', instructor: 'Nadira' },
  ],
};
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---- STATE ---- */
const state = {
  selectedClass: null,
  sessionType: 'group',
  selectedDate: null,
  selectedTime: null,
  selectedInstructor: null,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
};

/* ---- READ URL PARAMS ---- */
function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  const cls = params.get('class');
  const time = params.get('time');
  const instructor = params.get('instructor');

  if (cls) {
    // Pre-select class card
    const card = [...document.querySelectorAll('.class-select-card')]
      .find(c => c.dataset.class === decodeURIComponent(cls));
    if (card) {
      selectClass(card);
    }
  }

  if (instructor) {
    state.preselectedInstructor = decodeURIComponent(instructor);
  }
}

/* ---- STEP MANAGEMENT ---- */
let currentStep = 1;

function goToStep(step) {
  document.querySelectorAll('.booking-step').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`step${step}`);
  if (el) el.classList.remove('hidden');

  // Update indicators
  document.querySelectorAll('.step-indicator').forEach((ind, i) => {
    const n = i + 1;
    ind.classList.remove('active', 'done');
    if (n < step) ind.classList.add('done');
    else if (n === step) ind.classList.add('active');
  });

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- STEP 1 — CLASS SELECTION ---- */
function initStep1() {
  const grid = document.getElementById('classSelectGrid');
  const nextBtn = document.getElementById('step1Next');
  const toggleGroup = document.getElementById('toggleGroup');
  const togglePrivate = document.getElementById('togglePrivate');

  // Session type toggle
  function setSessionType(type) {
    state.sessionType = type;
    toggleGroup.classList.toggle('active', type === 'group');
    togglePrivate.classList.toggle('active', type === 'private');

    document.querySelectorAll('.class-select-card').forEach(card => {
      const cardType = card.dataset.type;
      if (type === 'group') {
        card.classList.toggle('hidden-card', cardType === 'private');
      } else {
        card.classList.toggle('hidden-card', cardType === 'group');
      }
    });

    // Reset selection if switching type
    if (state.selectedClass) {
      const selectedCard = document.querySelector('.class-select-card.selected');
      if (selectedCard && selectedCard.dataset.type !== type) {
        selectedCard.classList.remove('selected');
        state.selectedClass = null;
        nextBtn.disabled = true;
      }
    }
  }

  toggleGroup.addEventListener('click', () => setSessionType('group'));
  togglePrivate.addEventListener('click', () => setSessionType('private'));

  // Class card selection
  grid.addEventListener('click', e => {
    const card = e.target.closest('.class-select-card');
    if (!card || card.classList.contains('hidden-card')) return;
    selectClass(card);
  });

  nextBtn.addEventListener('click', () => {
    if (!state.selectedClass) return;
    goToStep(2);
    buildCalendar();
  });
}

function selectClass(card) {
  document.querySelectorAll('.class-select-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  state.selectedClass = card.dataset.class;

  // Set session type to match card
  const cardType = card.dataset.type;
  state.sessionType = cardType;
  document.getElementById('toggleGroup').classList.toggle('active', cardType === 'group');
  document.getElementById('togglePrivate').classList.toggle('active', cardType === 'private');

  document.querySelectorAll('.class-select-card').forEach(c => {
    c.classList.toggle('hidden-card', c.dataset.type !== cardType);
  });

  document.getElementById('step1Next').disabled = false;
}

/* ---- STEP 2 — CALENDAR ---- */
function buildCalendar() {
  const { currentMonth, currentYear } = state;
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonth').textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const daysContainer = document.getElementById('calDays');
  daysContainer.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun
  // Adjust: week starts Monday. Sunday is index 6
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day cal-day--empty';
    daysContainer.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const dayOfWeek = date.getDay();
    const dayName = DAY_NAMES[dayOfWeek];
    const isToday = date.getTime() === today.getTime();
    const isPast = date < today;
    const isSunday = dayOfWeek === 0;
    const hasClasses = SCHEDULE[dayName] && SCHEDULE[dayName].length > 0 && !isSunday;

    const el = document.createElement('div');
    el.textContent = d;
    el.className = 'cal-day';

    if (isPast || isSunday || !hasClasses) {
      el.classList.add('cal-day--disabled');
      if (isSunday) el.classList.add('cal-day--sunday');
    } else {
      el.classList.add('cal-day--available');
      if (isToday) el.classList.add('cal-day--today');

      // Check if this date is selected
      if (state.selectedDate) {
        const sel = new Date(state.selectedDate);
        if (sel.getFullYear() === currentYear && sel.getMonth() === currentMonth && sel.getDate() === d) {
          el.classList.add('cal-day--selected');
        }
      }

      el.addEventListener('click', () => selectDate(date));
    }

    daysContainer.appendChild(el);
  }
}

function selectDate(date) {
  state.selectedDate = date;
  state.selectedTime = null;
  state.selectedInstructor = null;
  document.getElementById('step2Next').disabled = true;

  // Rebuild calendar to reflect selection
  buildCalendar();

  // Show slots
  showTimeslots(date);
}

function showTimeslots(date) {
  const dayName = DAY_NAMES[date.getDay()];
  const slots = (SCHEDULE[dayName] || []).filter(s => {
    // Filter by selected class if possible; if private, show all
    if (state.selectedClass === 'Private Session' || state.selectedClass === 'Duo Session') return true;
    return s.className === state.selectedClass;
  });

  const list = document.getElementById('timeslotList');
  const instructorSelect = document.getElementById('instructorSelect');

  list.innerHTML = '';

  if (slots.length === 0) {
    list.innerHTML = '<p class="timeslot-placeholder">No classes available on this day for the selected class.</p>';
    instructorSelect.style.display = 'none';
    return;
  }

  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.className = 'timeslot-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <div>
        <div class="timeslot-btn__time">${slot.time}</div>
        <div class="timeslot-btn__class">${slot.className}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    `;
    btn.addEventListener('click', () => selectTimeslot(btn, slot));
    list.appendChild(btn);
  });

  instructorSelect.style.display = 'none';
}

function selectTimeslot(btn, slot) {
  document.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedTime = slot.time;

  // Update instructor dropdown
  const instructorSelect = document.getElementById('instructorSelect');
  const dropdown = document.getElementById('instructorDropdown');
  const dayName = DAY_NAMES[state.selectedDate.getDay()];

  // Find all instructors for this class/time
  const instructors = (SCHEDULE[dayName] || [])
    .filter(s => s.time === slot.time)
    .map(s => s.instructor);

  dropdown.innerHTML = '';
  instructors.forEach(inst => {
    const opt = document.createElement('option');
    opt.value = inst;
    opt.textContent = inst;
    dropdown.appendChild(opt);
  });

  // Preselect instructor from URL param
  if (state.preselectedInstructor && instructors.includes(state.preselectedInstructor)) {
    dropdown.value = state.preselectedInstructor;
  }

  state.selectedInstructor = dropdown.value;
  dropdown.addEventListener('change', () => { state.selectedInstructor = dropdown.value; });

  instructorSelect.style.display = 'block';
  document.getElementById('step2Next').disabled = false;
}

function initStep2() {
  document.getElementById('calPrev').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    buildCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    buildCalendar();
  });
  document.getElementById('step2Back').addEventListener('click', () => goToStep(1));
  document.getElementById('step2Next').addEventListener('click', () => {
    state.selectedInstructor = document.getElementById('instructorDropdown').value;
    if (!state.selectedDate || !state.selectedTime) return;
    goToStep(3);
    renderSummaryBar();
  });
}

/* ---- STEP 3 — DETAILS & SUBMIT ---- */
function renderSummaryBar() {
  const bar = document.getElementById('bookingSummaryBar');
  const dateStr = state.selectedDate
    ? state.selectedDate.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  bar.innerHTML = `
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Class</div>
      <div class="booking-summary-bar__value">${state.selectedClass || '—'}</div>
    </div>
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Date</div>
      <div class="booking-summary-bar__value">${dateStr}</div>
    </div>
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Time</div>
      <div class="booking-summary-bar__value">${state.selectedTime || '—'}</div>
    </div>
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Instructor</div>
      <div class="booking-summary-bar__value">${state.selectedInstructor || '—'}</div>
    </div>
  `;
}

function initStep3() {
  document.getElementById('step3Back').addEventListener('click', () => goToStep(2));
  document.getElementById('bookingForm').addEventListener('submit', handleSubmit);
}

function validateForm() {
  let valid = true;

  const name = document.getElementById('fullName');
  const email = document.getElementById('email');
  const phone = document.getElementById('phone');
  const policy = document.getElementById('policyCheck');

  // Clear errors
  ['nameError','emailError','phoneError','policyError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  [name, email, phone].forEach(f => f.classList.remove('error'));

  if (!name.value.trim()) {
    document.getElementById('nameError').textContent = 'Please enter your full name.';
    name.classList.add('error'); valid = false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    document.getElementById('emailError').textContent = 'Please enter a valid email address.';
    email.classList.add('error'); valid = false;
  }
  if (!phone.value.trim()) {
    document.getElementById('phoneError').textContent = 'Please enter your phone number.';
    phone.classList.add('error'); valid = false;
  }
  if (!policy.checked) {
    document.getElementById('policyError').textContent = 'You must agree to the cancellation policy.';
    valid = false;
  }
  return valid;
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitBtnText');
  const spinner = document.getElementById('submitSpinner');
  const errorBanner = document.getElementById('formErrorBanner');

  // Show spinner
  submitText.classList.add('hidden');
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;
  errorBanner.classList.add('hidden');

  const payload = {
    fullName: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    className: state.selectedClass,
    sessionType: state.sessionType,
    date: state.selectedDate
      ? state.selectedDate.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '',
    time: state.selectedTime,
    instructor: state.selectedInstructor,
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === 'success') {
      showConfirmation(payload, data.bookingId);
    } else {
      throw new Error('Unexpected response');
    }
  } catch (err) {
    // Demo mode: still show confirmation with mock ID
    const mockId = 'MF-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000);
    showConfirmation(payload, mockId, true);
  } finally {
    submitText.classList.remove('hidden');
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

function showConfirmation(payload, bookingId, isDemoMode = false) {
  goToStep(4);

  const summary = document.getElementById('confirmationSummary');
  const rows = [
    { key: 'Booking ID', val: `<span class="confirmation__booking-id">${bookingId}</span>` },
    { key: 'Class', val: payload.className },
    { key: 'Date', val: payload.date },
    { key: 'Time', val: payload.time },
    { key: 'Instructor', val: payload.instructor },
    { key: 'Name', val: payload.fullName },
    { key: 'Confirmation', val: payload.email },
  ];
  summary.innerHTML = rows.map(r => `
    <div class="confirmation__summary-row">
      <span class="confirmation__summary-key">${r.key}</span>
      <span class="confirmation__summary-val">${r.val}</span>
    </div>
  `).join('');

  if (isDemoMode) {
    const note = document.createElement('p');
    note.style.cssText = 'font-size:0.72rem;color:rgba(255,255,255,0.3);text-align:center;margin-top:0.75rem;';
    note.textContent = 'Demo mode — connect Apps Script to send real confirmations.';
    summary.appendChild(note);
  }

  // Animate checkmark with GSAP
  if (typeof gsap !== 'undefined') {
    gsap.to('.confirmation__circle-stroke', {
      strokeDashoffset: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 0.2,
    });
    gsap.to('.confirmation__check', {
      strokeDashoffset: 0,
      duration: 0.5,
      ease: 'power2.out',
      delay: 0.8,
    });
    gsap.from('.confirmation__heading, .confirmation__sub, .confirmation__summary, .confirmation__note, .confirmation a', {
      y: 20, opacity: 0,
      duration: 0.6, stagger: 0.1, ease: 'power2.out',
      delay: 0.5,
    });
  }
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  initStep1();
  initStep2();
  initStep3();
  readURLParams();
  goToStep(1);
});
