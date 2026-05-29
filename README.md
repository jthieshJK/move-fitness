# Move Fitness — Pilates Studio Website

Premium reformer Pilates studio demo website for **Move Fitness**, Mont Kiara, Kuala Lumpur.

## Files

| File | Purpose |
|---|---|
| `index.html` + `style.css` + `main.js` | Main landing page |
| `booking.html` + `booking.css` + `booking.js` | 3-step booking flow |
| `admin.html` + `admin.css` + `admin.js` | Admin dashboard (password: `6466`) |
| `apps-script.gs` | Google Apps Script backend (paste into Google Apps Script) |

## Hosting on GitHub Pages

1. Create a new GitHub repository
2. Upload all files (flat structure — no subdirectories)
3. Go to **Settings → Pages → Source → Deploy from branch → main / (root)**
4. Your site will be live at `https://yourusername.github.io/repo-name`

## Backend Setup (Google Apps Script)

1. Open Google Sheets → **Extensions → Apps Script**
2. Paste the contents of `apps-script.gs` into `Code.gs`
3. Replace `SHEET_ID` with your Google Sheet's ID (from the URL)
4. Replace `ADMIN_EMAIL` with the studio email
5. **Deploy → New deployment → Web app** (Execute as: Me, Access: Anyone)
6. Copy the Web App URL and paste it into `booking.js`:
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_ID/exec";
   ```
7. Set time-driven triggers for `sendDailyReminder`, `sendPostClassFollowUp`, `sendDailyAdminSummary`

## Google Sheet Columns

Create a sheet named **Bookings** with these headers in row 1:

`Timestamp | Booking ID | Client Full Name | Client Email | Client Phone | Class Name | Class Date | Class Time | Instructor | Special Notes | Status | Confirmation Sent | Reminder Sent | Follow-Up Sent`

## Admin Dashboard

- URL: `/admin.html`
- Password: `6466`
- Features: Overview stats, bookings table with search, weekly schedule, studio settings

## Tech Stack

- Pure HTML5, CSS3, JavaScript — no frameworks or build tools
- GSAP 3 + ScrollTrigger (CDN) for all animations
- Google Fonts: Cormorant Garamond + DM Sans
- Backend: Google Sheets + Google Apps Script + Gmail (MailApp)
