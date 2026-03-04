# Ocean View Resort — Modern Frontend (HTML + Bootstrap + Vanilla JS)

This frontend connects to your **Payara backend** (`oceanview-backend`) using REST APIs.

## 1) Configure API Base URL
Default:
- `http://localhost:8080/oceanview-backend/api`

You can change it:
- On **Login page** (gear icon) OR
- In **App Settings** (gear button in sidebar)

The value is saved in your browser (localStorage).

## 2) Run Frontend
Use any static server (recommended):
- VS Code → **Live Server**
- or Python:
  - `python -m http.server 5500`

Then open:
- `http://localhost:5500/index.html`

## 3) Login
Use a user that exists in your MySQL `users` table (password must match bcrypt hash in DB).

## 4) Features included
- Login (JWT)
- Room types & rates (read-only)
- Check room availability (by type + date range)
- Create reservation (auto-pick room OR select available room)
- Find/manage reservation (update dates/room type, cancel, check-in, check-out)
- Advanced payments (advance/balance/refund) + payment history
- Audit log (ADMIN only)
- Help tab for new staff

## Notes
- Backend already sets `Access-Control-Allow-Origin: *` so CORS works for local dev.
- “Recent Reservations” list is saved only on the browser you use.
