# Calgary Neighbourhood Analytics

A side project by Abdullah Zubair for exploring the public records behind Calgary homes and neighbourhoods. Pick a place on the map, compare a few areas, work through ownership costs and print a research brief with its sources attached.

[Open the demo](https://calgary-neighbourhood-analytics.vercel.app)

## What's here

- A 3D map of Calgary's communities and quadrants, with optional 2025 aerial imagery.
- 2026 residential assessment summaries, sample properties and live City address lookups. Assessments aren't sale prices.
- Mortgage, tax and ownership-cost calculators with editable assumptions and costs left unconfirmed when the data is missing.
- Census context, transit stops and dated schedules, plus nearby schools, parks, groceries and other amenities.
- Historical 2018–2019 crime counts for selected categories, with current CPS reports linked separately. There is no current safety score.
- Public water-service records and detailed water-main/break extracts for four study communities. Private plumbing still needs inspection.
- Dated AQHI observations, a live refresh, historical PM2.5 readings and selected flood/noise context.
- Federal and municipal representatives, links to the current MLA directory, and historical election comparisons for the study areas.

Coverage varies by dataset. [Data notes](docs/data-notes.md) explain the dates, counts and gaps; the app's source cards keep those details beside the results. Saved places and checklists stay in the browser.

## Run it locally

Built with Next.js, React, TypeScript and MapLibre. Use Node 24.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. Maps and live lookups need an internet connection. No API keys or paid data subscription are needed for the current setup.

```sh
npm run check
npm run build
npm start
```

`check` runs TypeScript, lint, tests and data validation. The production build uses the standard `.next` directory; `npm start` serves it at `http://localhost:3000`.

## Checks and deployments

GitHub Actions runs the code checks, tests, data validation and a production build on pushes to `main` and pull requests. Vercel is connected to this repository and runs `npm run check` before its build. Pushes to `main` update the demo once those checks and the build pass.

The daily source check reports changes in the City's assessment metadata or schema. It leaves the bundled data alone so updates can be reviewed first.

## Working on the data

Bundled snapshots live in `public/data`. Keep a source's observation period separate from the day it was downloaded. Missing values should stay missing, and a new download shouldn't make an old dataset look current.

When updating a snapshot, review its source terms, update the source cards and record the new hashes in [the data manifest](docs/data-manifest.json). The source monitor reports upstream changes for review; it doesn't replace published data automatically. [Assessment extraction notes](docs/assessment-extraction.json) record the larger residential cohort and reconciliation checks.

## Privacy and reuse

The project is operated from Alberta, Canada. There are no accounts, ads or visitor analytics. Browser saves are local, but hosting, searches and map requests still involve service providers. The [privacy policy](https://calgary-neighbourhood-analytics.vercel.app/privacy), also available at `/privacy` locally, explains the data flows and deletion controls. [Privacy operations](docs/privacy-operations.md) records the maintenance duties and provider limitations. Questions or corrections: [az28140@icloud.com](mailto:az28140@icloud.com).

Map credits belong with the map: OpenFreeMap, OpenMapTiles and OpenStreetMap contributors. Aerial imagery is credited to © The City of Calgary, 2025 and is viewed through the hosted service; it isn't bundled or included in printable briefs. Source data, map styles and dependencies have separate reuse terms. See the [source licence register](public/data/rights-register.json), [public-sharing review](public/PUBLIC-SHARING-REVIEW.md) and [third-party notices](public/THIRD-PARTY-NOTICES.txt).

This is a research aid. It doesn't provide MLS listings, sale-price history, guaranteed school assignments, insurance quotes or property-specific legal and inspection conclusions.
