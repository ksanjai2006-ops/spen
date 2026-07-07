# SpendSmart — Personal Finance Tracker

A **zero-backend, zero-database** personal finance tracker that runs entirely in the browser using localStorage. Deploy it to Vercel in 60 seconds.

## ✨ Features

- 📊 **Dashboard** — Income, Expense, Balance, Monthly summary cards + 3 charts
- 💳 **Transactions** — Add, edit, delete, duplicate, search, filter, sort, paginate, CSV export
- 🎯 **Budgets** — Set monthly category limits with visual progress bars and warning/exceeded alerts
- 🐷 **Savings Goals** — Track goals with target amounts, deadlines, and progress
- 📈 **Analytics** — Category breakdown, income sources doughnut, daily spending heatmap, top expenses
- 🌙 **Dark/Light mode** — Persistent theme switching
- 📱 **Fully responsive** — Works on mobile, tablet, and desktop
- 💾 **Persistent storage** — All data saved to browser localStorage (no server needed)
- 🔄 **Recurring transactions** — Mark income/expenses as weekly/monthly/yearly
- ⬇️ **CSV Export** — Download your transactions

## 🚀 Deploy to Vercel

### Option 1 — Drag & Drop (Fastest)
1. Go to [vercel.com/new](https://vercel.com/new)
2. Drag the `spending-tracker/` folder into the upload area
3. Click Deploy — done!

### Option 2 — GitHub
1. Push this folder to a GitHub repository
2. Import the repo in Vercel dashboard
3. Framework: **Other** (no build step needed)
4. Click Deploy

### Option 3 — Vercel CLI
```bash
npm i -g vercel
cd spending-tracker
vercel
```

## 📁 Files

```
spending-tracker/
├── index.html    # App structure + modals
├── style.css     # Dark/light themes, responsive layout
├── app.js        # All logic (no framework, no build step)
└── vercel.json   # Vercel config
```

## 💡 Usage

The app loads with **demo data** pre-filled so you can explore all features immediately. Your real data is stored in your browser's localStorage — it persists across page refreshes.

To clear demo data: Open browser DevTools → Application → Local Storage → Delete `spendsmart_v2`
