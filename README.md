# Restroom Tracker | Taft DHH (Local Storage, GitHub Pages Ready)

- Password: **taftdhh2025**
- LocalStorage only (persistent until you click **Clear**)
- Teacher/Student dropdowns with Out/In buttons (smart enable/disable)
- Weekday tabs (Mon–Fri) to view logs by day
- Activity Log always visible (right side of selector on desktop)
- Delete last log (✖) for the selected teacher/day
- Separate sign sheets for each teacher
- Download **Month PDF** (Mon–Fri grouped by week) per teacher
- iPad devices are forced into **desktop** two-column view

## Run locally
```bash
npm i
npm run dev
```

## Deploy to GitHub Pages (branch: main)
1) Push this project to a GitHub repo (default branch **main**).

2) In **Settings → Pages**, set **Source: GitHub Actions**.

3) The included workflow builds and publishes `dist/` automatically.

## Notes
- Data is stored per browser profile/device.
- Use the **Clear** button (top-right) to reset and re-seed rosters.
