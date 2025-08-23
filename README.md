# 🚻 Restroom Tracker | Taft DHH

A React + Vite + Tailwind app for restroom out/in tracking with two teachers, per‑teacher logs & PDFs, PIN‑protected student management, and daily reset.

## Features
- Select **Teacher** → select **Student** → **Out/In**.
- Shows entries for **today 8:30 AM – 3:35 PM** only (display filter).
- **Logs persist** across reloads; **reset at 10:00 PM Pacific**.
- **Download PDF** per teacher (only today’s window).
- **Manage Students** (Add/Remove) requires **PIN**.

## Local development
```bash
npm install
npm run dev
```

## Deploy to GitHub Pages (Actions)
This repo includes a workflow at `.github/workflows/deploy.yml`.
1. Commit & push to `main`:
   ```bash
   git init
   git add .
   git commit -m "Init Restroom Tracker | Taft DHH"
   git branch -M main
   git remote add origin https://github.com/htnxlausd/restroom-tracker.git
   git push -u origin main
   ```
2. In GitHub: **Settings → Pages** → **Source: GitHub Actions**.
3. If your org protects the `github-pages` environment, approve the deployment or relax protection.

**Site URL:** `https://htnxlausd.github.io/restroom-tracker/`

If you change the repository name, update `base` in `vite.config.js` accordingly.

## Notes
- Requires Node.js 18+ (Node 20 LTS recommended).
- If you see `vite is not recognized`, use `npm run dev` or `npx vite`.
=======
A simple React app for restroom for students' sign-outs/ins for two teachers sharing one class room with separate activity logs, PDF export, and PIN-protected student management.
