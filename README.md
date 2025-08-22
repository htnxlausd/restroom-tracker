# 🚻 Restroom Tracker | Taft DHH

React + Vite + Tailwind restroom tracker.  
- Tracks restroom OUT/IN per teacher/student.  
- Shows only **today’s activity (8:00 AM – 4:00 PM)**.  
- Auto‑resets logs **10:00 PM Pacific** daily.  
- Exports **per‑teacher PDF logs**.  
- Manage students with PIN = 2022.

## Local Dev
```bash
npm install
npm run dev
```

## Deploy to GitHub Pages
Already configured (`vite.config.js` base: `/restroom-tracker/`).  
Either use a GitHub Actions workflow or manual deploy.

### Manual deploy (subtree)
```bash
npm run build
git subtree split --prefix dist -b gh-pages-temp
git push -f origin gh-pages-temp:gh-pages
git branch -D gh-pages-temp
```

Then set **Settings → Pages → Deploy from branch → gh-pages (root)**.

