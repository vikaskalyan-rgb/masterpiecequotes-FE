# Masterpiece Quotes — Frontend

Installable web app (React 19 + Vite) for building customer quotes on a phone and sending them
on WhatsApp as a PDF. Talks to the Spring Boot backend
([masterpiecequotes](https://github.com/vikaskalyan-rgb/masterpiecequotes)) for all data.

## What it does

- **Quotes**: grouped by month, searchable by name, phone or quote number (`MP-0042`),
  filterable by status. Unsaved quotes on this phone are listed at the top.
- **Builder**: rooms and items with voice input (Android), dimensions as length × width with the
  area shown live, past item names suggested as you type, repeat customers filled in from their
  last quote. The final total follows the items unless you set it by hand, and any difference
  from the items is spelled out. Removing a room or item can be undone.
  Work in progress is kept on the phone, so closing the app never loses a quote.
- **Import from Excel**: opens a quote sheet (`.xlsx` or `.csv`) as a new quote to check. Reads
  the app's template and the owner's own sheets: room headings or a Room column, sizes like `7x4`
  or `7'6"`, billed areas, lump sums, fittings, and the agreed total (before GST). Anything it had
  to work out is listed for review, and nothing is saved until the quote is confirmed.
- **Sending**: the PDF is prepared in the background when a quote opens, so the share sheet opens
  instantly. Every send keeps an exact copy of what the customer received; editing afterwards
  shows a reminder to send again.
- **Insights**: quoted and won value, win rate, last six months, biggest customers. Drafts never
  count as quoted.
- **Settings**: business details printed on every quote, rounding rule, validity period,
  starting text for new quotes, backup to JSON or Excel, restore, recently deleted quotes.

## Design

One typeface (Archivo, self-hosted so it works offline and matches the PDF), a quiet white and
ink base, and the four room colours of the Masterpiece logo as the only accents: each room in a
quote takes one, in the app and in the PDF's cost breakdown. Tokens live in
`src/styles/tokens.css`.

The PDF (`src/pdf/QuoteDocument.jsx`) is real text with embedded fonts, laid out like an interior
drawing set: a title block with quote number, date, validity and signatory; rooms in the logo's
colours; items → adjustment → total; material specification, terms and signature lines.
`src/pdf/fonts` holds Archivo with Latin and Latin Extended merged so ₹ prints correctly
(SIL Open Font License, see `OFL.txt`).

## Local setup

1. `npm install`
2. `cp .env.example .env.local` and set `VITE_API_BASE_URL` to your backend
3. `npm run dev` and sign in with the backend's `APP_PASSWORD`

## Checks

```
npm run lint    # oxlint
npm test        # vitest: money math (mirrors the backend), dates, phone numbers, validation, drafts
npm run build
```

GitHub Actions runs all three on every push and pull request.

## Deploying to Vercel

1. Set `VITE_API_BASE_URL` in Vercel's environment variables to the Render backend URL.
2. Make sure the backend's `CORS_ORIGINS` includes the Vercel URL.
3. `vercel.json` handles client-side routing and sets security headers. Its Content Security Policy
   allows API calls to `*.onrender.com`; if the backend moves to another domain, add it to
   `connect-src` there.

After a deploy, installed copies of the app show "A new version of the app is ready" with an
Update button, instead of reloading in the middle of a quote.
