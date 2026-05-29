// ============================================================
//  MOVE FITNESS — Google Apps Script Backend
//  apps-script.gs
// ============================================================
//
//  DEPLOYMENT INSTRUCTIONS
//  ──────────────────────────────────────────────────────────
//  1. Open Google Sheets → Extensions → Apps Script.
//  2. Paste this entire file into Code.gs (replace all default code).
//  3. Update SHEET_ID and ADMIN_EMAIL constants below.
//  4. Click Deploy → New deployment → Web app.
//     · Execute as: Me
//     · Who has access: Anyone
//  5. Copy the Web App URL displayed after deployment.
//     Paste it into booking.js as:
//         const APPS_SCRIPT_URL = "https://script.google.com/...";
//  6. On first run, authorise permissions when prompted.
//  7. Set Time-Driven Triggers (Extensions → Apps Script → Triggers → + Add Trigger):
//     ┌─────────────────────────────┬───────────┬────────────────────┐
//     │ Function                    │ Type      │ Time               │
//     ├─────────────────────────────┼───────────┼────────────────────┤
//     │ sendDailyReminder           │ Day timer │ 8:00 AM – 9:00 AM  │
//     │ sendPostClassFollowUp       │ Day timer │ 9:00 AM – 10:00 AM │
//     │ sendDailyAdminSummary       │ Day timer │ 7:00 AM – 8:00 AM  │
//     └─────────────────────────────┴───────────┴────────────────────┘
//
//  GOOGLE SHEET SETUP
//  ──────────────────────────────────────────────────────────
//  Create a sheet named "Bookings" with these column headers in row 1:
//  A: Timestamp  B: Booking ID  C: Client Full Name  D: Client Email
//  E: Client Phone  F: Class Name  G: Class Date  H: Class Time
//  I: Instructor  J: Special Notes  K: Status  L: Confirmation Sent
//  M: Reminder Sent  N: Follow-Up Sent
//
//  Apply conditional formatting:
//    K = "Confirmed"  → Green background
//    K = "Cancelled"  → Red background
//    K = "Completed"  → Blue background
// ============================================================

const SHEET_ID    = "REPLACE_WITH_SHEET_ID";
const ADMIN_EMAIL = "jpactupac@gmail.com";
const SHEET_NAME  = "Bookings";

// Column index map (1-based)
const COL = {
  TIMESTAMP:          1,
  BOOKING_ID:         2,
  CLIENT_NAME:        3,
  CLIENT_EMAIL:       4,
  CLIENT_PHONE:       5,
  CLASS_NAME:         6,
  CLASS_DATE:         7,
  CLASS_TIME:         8,
  INSTRUCTOR:         9,
  NOTES:             10,
  STATUS:            11,
  CONFIRMATION_SENT: 12,
  REMINDER_SENT:     13,
  FOLLOW_UP_SENT:    14,
};

// ============================================================
//  HELPER: Get Sheet
// ============================================================
function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

// ============================================================
//  HELPER: Generate Booking ID
//  Format: MF-YYYYMMDD-XXXX (4 random digits)
// ============================================================
function generateBookingId() {
  const now = new Date();
  const datePart = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MF-${datePart}-${rand}`;
}

// ============================================================
//  HELPER: Phone to WhatsApp number
// ============================================================
function toWhatsApp(phone) {
  // Remove spaces, dashes, parentheses; prefix 60 if Malaysian number
  let num = phone.replace(/[\s\-\(\)]/g, "");
  if (num.startsWith("+")) num = num.slice(1);
  if (num.startsWith("0")) num = "60" + num.slice(1);
  return num;
}

// ============================================================
//  doPost — Main webhook handler
//  Receives POST from booking.js, saves to sheet, sends emails
// ============================================================
function doPost(e) {
  try {
    const raw = e.postData.contents;
    const data = JSON.parse(raw);

    const {
      fullName    = "",
      email       = "",
      phone       = "",
      notes       = "",
      className   = "",
      sessionType = "group",
      date        = "",
      time        = "",
      instructor  = "",
    } = data;

    // Validate required fields
    if (!fullName || !email || !className || !date || !time) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Missing required fields." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const bookingId = generateBookingId();
    const timestamp = new Date();
    const sheet = getSheet();

    // Append row
    sheet.appendRow([
      timestamp,        // A: Timestamp
      bookingId,        // B: Booking ID
      fullName,         // C: Client Full Name
      email,            // D: Client Email
      phone,            // E: Client Phone
      className,        // F: Class Name
      date,             // G: Class Date
      time,             // H: Class Time
      instructor,       // I: Instructor
      notes,            // J: Special Notes
      "Confirmed",      // K: Status
      false,            // L: Confirmation Email Sent
      false,            // M: Reminder Sent
      false,            // N: Follow-Up Sent
    ]);

    const booking = { bookingId, fullName, email, phone, notes, className, sessionType, date, time, instructor };

    // Send emails (wrapped so a mail error doesn't break the booking)
    try { sendClientConfirmation(booking); } catch (mailErr) { Logger.log("Confirmation email error: " + mailErr); }
    try { sendAdminNotification(booking); }  catch (mailErr) { Logger.log("Admin notification error: " + mailErr); }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", bookingId: bookingId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost error: " + err);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow CORS preflight
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Move Fitness Booking API" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  sendClientConfirmation
//  Sends branded HTML confirmation email to the client
// ============================================================
function sendClientConfirmation(booking) {
  const subject = `Your Move Fitness class is confirmed — ${booking.className} on ${booking.date}`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f8f5f0; font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; }
    .wrap { max-width: 560px; margin: 0 auto; background: #ffffff; }
    .header { background: #1a1a2e; padding: 36px 40px; text-align: center; }
    .header-logo { color: #ffffff; font-size: 28px; letter-spacing: 0.2em; font-weight: 400; }
    .header-sub { color: rgba(255,255,255,0.5); font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; margin-top: 4px; }
    .body { padding: 40px; }
    .check-icon { width: 56px; height: 56px; background: rgba(200,169,110,0.12); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 24px; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; color: #1a1a2e; margin: 0 0 8px; }
    .subtitle { font-size: 14px; color: #6b6b6b; margin: 0 0 32px; }
    .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .summary-table tr { border-bottom: 1px solid #f0ede8; }
    .summary-table td { padding: 12px 0; font-size: 14px; }
    .summary-table td:first-child { color: #aaa; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; width: 40%; }
    .summary-table td:last-child { color: #1a1a2e; font-weight: 500; }
    .booking-id { color: #c8a96e; font-family: monospace; font-size: 15px; font-weight: 700; }
    .info-box { background: #f8f5f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; font-size: 13px; color: #6b6b6b; line-height: 1.7; }
    .info-box strong { color: #1a1a2e; }
    .policy-box { border-left: 3px solid #c8a96e; padding: 12px 16px; background: rgba(200,169,110,0.06); border-radius: 0 6px 6px 0; margin-bottom: 32px; font-size: 13px; color: #6b6b6b; line-height: 1.6; }
    .footer { background: #111122; padding: 28px 40px; text-align: center; }
    .footer-text { color: rgba(255,255,255,0.35); font-size: 12px; line-height: 1.8; }
    .footer-text a { color: #c8a96e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-logo">MOVE</div>
      <div class="header-sub">FITNESS</div>
    </div>
    <div class="body">
      <div style="text-align:center; margin-bottom:28px;">
        <div class="check-icon">✓</div>
        <h1>You're booked in.</h1>
        <p class="subtitle">Here's your booking summary. See you on the mat!</p>
      </div>

      <table class="summary-table">
        <tr><td>Booking ID</td><td><span class="booking-id">${booking.bookingId}</span></td></tr>
        <tr><td>Class</td><td>${booking.className}</td></tr>
        <tr><td>Date</td><td>${booking.date}</td></tr>
        <tr><td>Time</td><td>${booking.time}</td></tr>
        <tr><td>Instructor</td><td>${booking.instructor}</td></tr>
        <tr><td>Location</td><td>Move Fitness, Mont Kiara, KL</td></tr>
        <tr><td>Name</td><td>${booking.fullName}</td></tr>
      </table>

      <div class="info-box">
        <strong>Before your class:</strong><br>
        · Please arrive <strong>10 minutes early</strong> to get settled.<br>
        · <strong>Grip socks are required</strong> — available at reception for RM 15 if you don't have a pair.<br>
        · Bring a water bottle and comfortable activewear.<br>
        · The studio is on the <strong>3rd floor, Mont Kiara Meridin</strong>.
      </div>

      <div class="policy-box">
        <strong>Cancellation Policy:</strong> Cancellations must be made at least <strong>24 hours</strong> before your class. Late cancellations and no-shows are non-refundable. To cancel, reply to this email or WhatsApp us.
      </div>

      <p style="font-size:14px;color:#6b6b6b;text-align:center;">
        Questions? <a href="https://wa.me/60123456789" style="color:#c8a96e;">WhatsApp us</a> or email
        <a href="mailto:hello@movefitness.my" style="color:#c8a96e;">hello@movefitness.my</a>
      </p>
    </div>
    <div class="footer">
      <div class="footer-text">
        Move Fitness · Mont Kiara, Kuala Lumpur<br>
        <a href="mailto:hello@movefitness.my">hello@movefitness.my</a> · +60 12-345 6789<br>
        <a href="https://wa.me/60123456789">WhatsApp</a> · <a href="#">Instagram</a> · <a href="#">TikTok</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  MailApp.sendEmail({
    to: booking.email,
    subject: subject,
    htmlBody: htmlBody,
    name: "Move Fitness",
    replyTo: ADMIN_EMAIL,
  });

  // Update column L: Confirmation Email Sent = TRUE
  updateColumnForBooking(booking.bookingId, COL.CONFIRMATION_SENT, true);
}

// ============================================================
//  sendAdminNotification
//  Sends new booking alert to the studio admin
// ============================================================
function sendAdminNotification(booking) {
  const subject = `New Booking — ${booking.fullName} | ${booking.className} | ${booking.date} ${booking.time}`;
  const waLink = `https://wa.me/${toWhatsApp(booking.phone)}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; padding: 28px; max-width: 520px; margin: 0 auto; border-top: 3px solid #c8a96e; }
  h2 { color: #1a1a2e; font-size: 18px; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f0ede8; }
  td:first-child { color: #888; width: 38%; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  td:last-child { color: #1a1a2e; font-weight: 500; }
  .notes-box { background: #f8f5f0; border-radius: 6px; padding: 12px 16px; margin-top: 16px; font-size: 13px; color: #666; }
  .actions { margin-top: 20px; display: flex; gap: 12px; }
  .action-btn { display: inline-block; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; text-decoration: none; }
  .btn-wa { background: #25d366; color: #fff; }
  .btn-email { background: #1a1a2e; color: #fff; }
</style></head>
<body>
<div class="card">
  <h2>📋 New Booking Received</h2>
  <table>
    <tr><td>Booking ID</td><td style="color:#c8a96e;font-family:monospace;">${booking.bookingId}</td></tr>
    <tr><td>Client Name</td><td>${booking.fullName}</td></tr>
    <tr><td>Email</td><td><a href="mailto:${booking.email}">${booking.email}</a></td></tr>
    <tr><td>Phone</td><td><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
    <tr><td>Class</td><td>${booking.className}</td></tr>
    <tr><td>Type</td><td>${booking.sessionType === 'private' ? 'Private / Duo' : 'Group Class'}</td></tr>
    <tr><td>Date</td><td>${booking.date}</td></tr>
    <tr><td>Time</td><td>${booking.time}</td></tr>
    <tr><td>Instructor</td><td>${booking.instructor}</td></tr>
  </table>
  ${booking.notes ? `<div class="notes-box"><strong>Special Notes:</strong><br>${booking.notes}</div>` : ''}
  <div class="actions">
    <a class="action-btn btn-wa" href="${waLink}">WhatsApp Client</a>
    <a class="action-btn btn-email" href="mailto:${booking.email}">Email Client</a>
  </div>
</div>
</body>
</html>`;

  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: subject,
    htmlBody: htmlBody,
    name: "Move Fitness Booking System",
  });
}

// ============================================================
//  sendDailyReminder
//  Time-triggered at 8AM. Sends reminder for tomorrow's classes.
// ============================================================
function sendDailyReminder() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, tz, "d MMMM yyyy");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate   = row[COL.CLASS_DATE         - 1];
    const status    = row[COL.STATUS             - 1];
    const reminded  = row[COL.REMINDER_SENT      - 1];
    const email     = row[COL.CLIENT_EMAIL       - 1];
    const name      = row[COL.CLIENT_NAME        - 1];
    const className = row[COL.CLASS_NAME         - 1];
    const time      = row[COL.CLASS_TIME         - 1];
    const instructor= row[COL.INSTRUCTOR         - 1];
    const bookingId = row[COL.BOOKING_ID         - 1];

    // Match date string — stored as the formatted date string
    const rowDateStr = typeof rowDate === 'object'
      ? Utilities.formatDate(rowDate, tz, "d MMMM yyyy")
      : rowDate.toString();

    if (rowDateStr === tomorrowStr && status === "Confirmed" && !reminded) {
      const subject = `Reminder: Your Move Fitness class is tomorrow — ${className} at ${time}`;
      const mapsLink = `https://www.google.com/maps/search/Mont+Kiara+Meridin+Kuala+Lumpur`;

      const htmlBody = `
<!DOCTYPE html><html><head><style>
body { font-family: Arial, sans-serif; background: #f8f5f0; margin: 0; padding: 20px; }
.card { background: #fff; border-radius: 8px; padding: 32px; max-width: 520px; margin: 0 auto; border-top: 3px solid #c8a96e; }
h2 { color: #1a1a2e; font-size: 20px; margin: 0 0 8px; }
.subtitle { color: #888; font-size: 14px; margin: 0 0 24px; }
.detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0ede8; font-size: 14px; }
.detail-label { color: #aaa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
.detail-val { color: #1a1a2e; font-weight: 500; }
.reminder-box { background: rgba(200,169,110,0.08); border-radius: 8px; padding: 16px 20px; margin: 24px 0; font-size: 13px; color: #555; line-height: 1.8; }
.cta { text-align: center; margin-top: 20px; }
.cta a { display: inline-block; background: #1a1a2e; color: #fff; padding: 12px 28px; border-radius: 24px; font-size: 14px; font-weight: 600; text-decoration: none; }
</style></head>
<body>
<div class="card">
  <h2>See you tomorrow, ${name.split(' ')[0]}!</h2>
  <p class="subtitle">Here's a quick reminder for your upcoming class.</p>
  <div class="detail-row"><span class="detail-label">Class</span><span class="detail-val">${className}</span></div>
  <div class="detail-row"><span class="detail-label">Date</span><span class="detail-val">Tomorrow · ${rowDateStr}</span></div>
  <div class="detail-row"><span class="detail-label">Time</span><span class="detail-val">${time}</span></div>
  <div class="detail-row"><span class="detail-label">Instructor</span><span class="detail-val">${instructor}</span></div>
  <div class="detail-row"><span class="detail-label">Location</span><span class="detail-val">Move Fitness, Mont Kiara KL</span></div>
  <div class="reminder-box">
    <strong>What to bring:</strong><br>
    · Grip socks (required — available at reception RM 15)<br>
    · Water bottle<br>
    · Comfortable activewear<br>
    · Arrive 10 minutes early to get settled
  </div>
  <div class="cta">
    <a href="${mapsLink}" target="_blank">📍 Get Directions</a>
  </div>
  <p style="text-align:center;font-size:12px;color:#bbb;margin-top:20px;">
    Need to cancel? Reply to this email at least 24 hours before your class.<br>
    Or <a href="https://wa.me/60123456789" style="color:#c8a96e;">WhatsApp us</a>.
  </p>
</div>
</body></html>`;

      try {
        MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: "Move Fitness", replyTo: ADMIN_EMAIL });
        updateRowColumn(i + 1, COL.REMINDER_SENT, true);
      } catch (e) {
        Logger.log("Reminder email failed for row " + (i + 1) + ": " + e);
      }
    }
  }
}

// ============================================================
//  sendPostClassFollowUp
//  Time-triggered at 9AM. Sends follow-up for yesterday's classes.
// ============================================================
function sendPostClassFollowUp() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = Utilities.formatDate(yesterday, tz, "d MMMM yyyy");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate    = row[COL.CLASS_DATE       - 1];
    const status     = row[COL.STATUS           - 1];
    const followed   = row[COL.FOLLOW_UP_SENT   - 1];
    const email      = row[COL.CLIENT_EMAIL     - 1];
    const name       = row[COL.CLIENT_NAME      - 1];
    const className  = row[COL.CLASS_NAME       - 1];
    const instructor = row[COL.INSTRUCTOR       - 1];

    const rowDateStr = typeof rowDate === 'object'
      ? Utilities.formatDate(rowDate, tz, "d MMMM yyyy")
      : rowDate.toString();

    if (rowDateStr === yesterdayStr && status === "Confirmed" && !followed) {
      const subject = `How was your class? — Move Fitness`;

      const htmlBody = `
<!DOCTYPE html><html><head><style>
body { font-family: Arial, sans-serif; background: #f8f5f0; margin: 0; padding: 20px; }
.card { background: #fff; border-radius: 8px; padding: 32px; max-width: 520px; margin: 0 auto; border-top: 3px solid #c8a96e; }
h2 { color: #1a1a2e; font-size: 20px; margin: 0 0 8px; }
p { font-size: 14px; color: #6b6b6b; line-height: 1.7; }
.cta-group { display: flex; flex-direction: column; gap: 10px; margin: 28px 0; }
.cta-btn { display: inline-block; padding: 12px 24px; border-radius: 24px; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; }
.cta-review { background: #c8a96e; color: #1a1a2e; }
.cta-book { background: #1a1a2e; color: #fff; }
.footer-note { font-size: 12px; color: #bbb; text-align: center; }
</style></head>
<body>
<div class="card">
  <h2>Thank you for joining us, ${name.split(' ')[0]}!</h2>
  <p>We hope you enjoyed your <strong>${className}</strong> class with <strong>${instructor}</strong> yesterday. Your commitment to moving with intention is what makes this community so special.</p>
  <p>If you have a moment, we'd love a quick review — it really helps other movers find us.</p>
  <div class="cta-group">
    <a class="cta-btn cta-review" href="https://g.page/r/REPLACE_WITH_GOOGLE_REVIEW_LINK" target="_blank">⭐ Leave a Google Review</a>
    <a class="cta-btn cta-book" href="https://REPLACE_WITH_YOUR_BOOKING_URL/booking.html" target="_blank">Book Your Next Class</a>
  </div>
  <p>See you on the mat again soon!</p>
  <p style="margin-top:16px;">With warmth,<br><strong>The Move Fitness Team</strong></p>
  <p class="footer-note" style="margin-top:28px;">
    Move Fitness · Mont Kiara, Kuala Lumpur<br>
    <a href="https://wa.me/60123456789" style="color:#c8a96e;">WhatsApp</a> · <a href="mailto:hello@movefitness.my" style="color:#c8a96e;">hello@movefitness.my</a>
  </p>
</div>
</body></html>`;

      try {
        MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: "Move Fitness", replyTo: ADMIN_EMAIL });
        updateRowColumn(i + 1, COL.FOLLOW_UP_SENT, true);
      } catch (e) {
        Logger.log("Follow-up email failed for row " + (i + 1) + ": " + e);
      }
    }
  }
}

// ============================================================
//  sendDailyAdminSummary
//  Time-triggered at 7AM. Sends today's class list to admin.
// ============================================================
function sendDailyAdminSummary() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();
  const today = new Date();
  const todayStr = Utilities.formatDate(today, tz, "d MMMM yyyy");
  const todayDisplay = Utilities.formatDate(today, tz, "EEEE, d MMMM yyyy");

  const classes = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = row[COL.CLASS_DATE - 1];
    const status  = row[COL.STATUS    - 1];

    const rowDateStr = typeof rowDate === 'object'
      ? Utilities.formatDate(rowDate, tz, "d MMMM yyyy")
      : rowDate.toString();

    if (rowDateStr === todayStr && status === "Confirmed") {
      classes.push({
        time:       row[COL.CLASS_TIME    - 1],
        className:  row[COL.CLASS_NAME    - 1],
        name:       row[COL.CLIENT_NAME   - 1],
        instructor: row[COL.INSTRUCTOR    - 1],
        phone:      row[COL.CLIENT_PHONE  - 1],
      });
    }
  }

  const subject = `Move Fitness — Today's Schedule | ${todayDisplay}`;

  let tableRows = '';
  if (classes.length > 0) {
    // Sort by time
    const timeOrder = ['7:00 AM','9:00 AM','11:00 AM','5:30 PM','7:00 PM'];
    classes.sort((a, b) => timeOrder.indexOf(a.time) - timeOrder.indexOf(b.time));

    tableRows = classes.map(c => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:13px;color:#c8a96e;font-weight:600;">${c.time}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:13px;color:#1a1a2e;font-weight:500;">${c.className}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:13px;color:#444;">${c.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:13px;color:#444;">${c.instructor}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:13px;">
          <a href="https://wa.me/${toWhatsApp(c.phone)}" style="color:#25d366;">WhatsApp</a>
        </td>
      </tr>`).join('');
  }

  const htmlBody = `
<!DOCTYPE html><html><head></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="background:#fff;border-radius:8px;padding:32px;max-width:640px;margin:0 auto;border-top:4px solid #c8a96e;">
  <h2 style="color:#1a1a2e;font-size:18px;margin:0 0 4px;">Today's Schedule</h2>
  <p style="color:#888;font-size:13px;margin:0 0 24px;">${todayDisplay}</p>
  ${classes.length === 0
    ? '<p style="color:#aaa;text-align:center;padding:24px 0;font-size:14px;">No classes scheduled today.</p>'
    : `<table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#1a1a2e;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Time</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Class</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Client</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Instructor</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Contact</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#888;">Total clients today: <strong style="color:#1a1a2e;">${classes.length}</strong></p>`
  }
</div>
</body></html>`;

  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: subject,
    htmlBody: htmlBody,
    name: "Move Fitness System",
  });
}

// ============================================================
//  HELPERS: Sheet row update utilities
// ============================================================

/**
 * Update a specific column for a booking by Booking ID.
 */
function updateColumnForBooking(bookingId, colIndex, value) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.BOOKING_ID - 1] === bookingId) {
      sheet.getRange(i + 1, colIndex).setValue(value);
      return;
    }
  }
}

/**
 * Update a specific column by row number (1-based).
 */
function updateRowColumn(rowNum, colIndex, value) {
  const sheet = getSheet();
  sheet.getRange(rowNum, colIndex).setValue(value);
}
