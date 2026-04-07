# Central Kitchen Ordering System

Next.js offline application for branch ordering and central kitchen consolidation.

## Features

- Branch selection landing page
- Product order page with search, category tabs, decimal quantities, and one-click confirm
- Insert-only order submission (never overwrite)
- Admin dashboard pivot summary by product x branch, with date filter
- Print mode optimized for A4 landscape
- Product and branch management (add/edit/delete)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Offline Data Storage

- All data is stored in `data/db.json`
- The app runs fully offline and does not require Supabase credentials
- You can edit `data/db.json` manually to seed products and branches
