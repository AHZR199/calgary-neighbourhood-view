# Calgary Neighbourhood View

A side project by Abdullah Zubair for exploring the public records behind Calgary homes and neighbourhoods. Pick a place on the map, compare a few areas, work through ownership costs and print a research brief with its sources attached.

[Open the demo](https://calgaryneighbourhoodview.com)

## What's here

- A 3D map of Calgary's communities and quadrants, with optional 2025 aerial imagery and nine custom landmark illustrations: Calgary Tower, the Saddledome, the Bow, Peace Bridge, Wonderland, TELUS Sky, Central Library, Historic City Hall and Canada Olympic Park.
- A neighbourhood finder with assessment-budget context, quadrant and distance limits, and adjustable priorities for everyday amenities, transit, parks and schools. Its shortlist explains the fit, compromises and missing data.
- 2026 residential assessment summaries, sample properties and live City address lookups. Assessments aren't sale prices.
- Click a home when zoomed in to look up its residential parcel. Buildings with several accounts show an address and unit chooser.
- Mortgage, tax and ownership-cost calculators with editable assumptions and costs left unconfirmed when the data is missing.
- Census context, transit stops and dated schedules, plus nearby schools, parks, groceries and other amenities.
- A school directory with elementary, junior high and high school filters, school-board search and straight-line distances. Browse inside an area or include schools across its boundary; designated schools still need checking with the board.
- Separate bus and CTrain route overlays, plus a dashed Green Line Phase 1 map. Planned service stays out of the transit score.
- Historical 2018–2019 crime counts for selected categories, with current CPS reports linked separately. There is no current safety score.
- Public water-service records and detailed water-main/break extracts for four study communities. Private plumbing still needs inspection.
- Dated AQHI observations, a live refresh, historical PM2.5 readings and selected flood/noise context.
- The City's recorded construction year, a sun-direction calculator and seasonal daylight comparisons for a selected address.
- Historical Calgary-region radon measurements and current testing guidance. Regional data can't establish radon levels in a home.
- Federal and municipal representatives, links to the current MLA directory, and historical election comparisons for the study areas.

Coverage varies by dataset. [Data notes](docs/data-notes.md) explain the dates, counts and gaps; the app's source cards keep those details beside the results. Saved places and checklists stay in the browser.

## Run it locally

Built with Next.js, React, TypeScript and MapLibre, with one shared Three.js renderer for the landmarks. Use Node 24.

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

The daily source check reports changes in the City's assessment metadata or schema. Ordinary updates produce a review warning, with details in the job summary and artifact. Broken schemas and connection failures still fail. It leaves the bundled data alone so updates can be reviewed first.

## Working on the data

Bundled snapshots live in `public/data`. Keep a source's observation period separate from the day it was downloaded. Missing values should stay missing, and a new download shouldn't make an old dataset look current.

When updating a snapshot, review its source terms, update the source cards and record the new hashes in [the data manifest](docs/data-manifest.json). The source monitor reports upstream changes for review; it doesn't replace published data automatically. [Assessment extraction notes](docs/assessment-extraction.json) record the larger residential cohort and reconciliation checks.

## Privacy and reuse

The project is operated from Alberta, Canada. There are no accounts, ads or visitor analytics. Browser saves are local, but hosting, searches and map requests still involve service providers. The [privacy policy](https://calgaryneighbourhoodview.com/privacy), also available at `/privacy` locally, explains the data flows and deletion controls. [Privacy operations](docs/privacy-operations.md) records the maintenance duties and provider limitations. Questions or corrections: [az28140@icloud.com](mailto:az28140@icloud.com).

The finder ranks 223 City Residential-class neighbourhood profiles; 219 have eligible assessment summaries. Matching runs in the browser over a bundled [profile dataset](public/data/neighbourhood-finder.json). Preferences are temporary page state, with no AI service, preference upload or new tracking. Assessment medians mix residential property types and are not listing prices. Hard limits stay separate from weighted preferences; demographics, crime, politics and radon are not ranking inputs.

The interface uses self-hosted [Lil Grotesk](public/fonts/lil-grotesk/README.md) by Bastien Sozeau / NoirBlancRouge, under the SIL Open Font License. The original font and its notices are bundled with the app.

Map credits belong with the map: OpenFreeMap, OpenMapTiles and OpenStreetMap contributors. Aerial imagery is credited to © The City of Calgary, 2025 and is viewed through the hosted service; it isn't bundled or included in printable briefs. Source data, map styles and dependencies have separate reuse terms. See the [source licence register](public/data/rights-register.json), [public-sharing review](public/PUBLIC-SHARING-REVIEW.md) and [third-party notices](public/THIRD-PARTY-NOTICES.txt).

The finder download and [landmark footprint extract](public/data/landmark-footprints.geojson) include OSM-derived information under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/), with City inputs separately attributed under their open-government licence. Landmark geometry is original procedural code with published dimensions where verified. Other dimensions, materials and placement are approximate; the ski jumps are a heritage depiction with compressed landing relief on the flat map. No external model, texture, blueprint, logo or photographic asset is included.

Wonderland (2012) is by [Jaume Plensa](https://jaumeplensa.com/works-and-projects/public-space/wonderland-2012); its simplified map illustration is independently made, not an artist-supplied mesh. Original code and attribution do not establish rights in the underlying architecture or artwork. The [public-sharing review](public/PUBLIC-SHARING-REVIEW.md) records the limits of the review, including why Canada's pictorial-reproduction exception is not treated as blanket permission for distributing 3D meshes.

This is a research aid. It doesn't provide MLS listings, sale-price history, guaranteed school assignments, insurance quotes or property-specific legal and inspection conclusions.

Sale prices and dates stay unavailable because no suitable free redistributable source was established. Sunlight calculations don't model trees, nearby buildings or window direction. The [data notes](docs/data-notes.md) and [use and limitations page](https://calgaryneighbourhoodview.com/terms) explain what these records and estimates can support.
