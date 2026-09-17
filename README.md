# Calgary Neighbourhood View

A side project by Abdullah Zubair for exploring the public records behind Calgary homes and neighbourhoods. Pick a place on the map, compare a few areas, work through ownership costs and print a research brief with its sources attached.

[Open the demo](https://calgaryneighbourhoodview.com)

[Features](#features) · [Run it locally](#run-it-locally) · [Checks and deployments](#checks-and-deployments) · [Privacy and reuse](#privacy-and-reuse)

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

## Features

The full list, grouped by what you can do. Expand a section for the details. Dataset counts and observation periods below describe the version reviewed on 17 September 2026; live lookups may return newer records.

<details>
<summary><strong>1. Interactive map and place search</strong></summary>

- Explore Calgary by panning, zooming, rotating and tilting the map.
- Switch between 2D and 3D.
- Reset the map to face north.
- Switch between the street map and 2025 City aerial imagery.
- Explore neighbourhood boundaries and Calgary's four quadrants.
- Search neighbourhoods, quadrants and residential addresses.
- Search live City assessment records.
- Click a neighbourhood to select it.
- Click a home or parcel at close zoom to find its residential assessment record.
- Choose the correct address or unit when several assessment accounts share a parcel.
- Filter those choices by unit, street or assessment-account number.
- See selected-place highlighting, property markers and assessed-value labels.

</details>

<details>
<summary><strong>2. Map layers</strong></summary>

- Bus routes and stops.
- Red and Blue CTrain lines and platforms.
- Planned Green Line Phase 1 alignment and stations.
- Independent switches for bus, CTrain and Green Line layers.
- A button to frame the entire planned Green Line route.
- Development applications.
- Parks and pathways.
- Municipal regulatory flood boundaries.
- Provincial flood-hazard mapping.
- Aircraft-noise forecast contours.
- Historical community crime shading.
- Public water mains coloured by material.
- Recorded water-main breaks.
- Federal and provincial electoral boundaries.
- Clickable features with available names, dates, descriptions and status.
- Legends explaining the displayed layers.

Transit represents published schedules, not live vehicle locations or arrivals. Green Line is shown as planned, not operating. Detailed water, development, park/pathway and flood extracts have limited coverage around the four study communities. One area overlay can be selected at a time; transport overlays can be combined.

</details>

<details>
<summary><strong>3. Custom Calgary landmarks</strong></summary>

Nine custom 3D illustrations:

- Calgary Tower
- The Bow
- Saddledome
- Peace Bridge
- Wonderland
- TELUS Sky
- Central Library
- Historic City Hall
- Canada Olympic Park

Each can be selected from the landmark menu and has a dedicated viewing angle, description, key fact, reference sources and a return-to-your-place action. These are approximate illustrations; Canada Olympic Park depicts its heritage ski-jump structures.

</details>

<details>
<summary><strong>4. Property records and assessment history</strong></summary>

- Individual residential assessed value.
- Assessment-account number.
- City-recorded construction year, where verified.
- Neighbourhood median assessment.
- Eligible residential-account count.
- Property lists sortable by address or assessed value.
- Additional records through Show more and address search.
- Assessment-history charts covering available years from 2017–2026.
- Select a year to inspect its value and change from the preceding year.
- Missing or conflicting history remains a gap.

The bundled summaries cover 499,477 eligible accounts across 248 communities, plus quadrant summaries. Assessments are not asking prices or sale prices. A recorded construction year doesn't establish renovation dates or the age of every structure on a parcel.

</details>

<details>
<summary><strong>5. Property-tax calculator</strong></summary>

- Editable residential assessed value.
- Estimated annual tax.
- Estimated monthly equivalent.
- Municipal and provincial portions.
- Future-bill scenario slider from −10% to +20%.
- Resulting annual bill and dollar difference.

It uses published 2026 rates. Future changes are user-entered scenarios, not predictions. Bill adjustments, supplementary items and fees are excluded.

</details>

<details>
<summary><strong>6. Mortgage and ownership-cost planner</strong></summary>

- Editable purchase price and down payment.
- Minimum-down-payment checks.
- Adjustable assumed mortgage interest rate.
- 25- or 30-year amortization options.
- Illustrative mortgage-default insurance costs and eligibility assumptions.
- Estimated monthly mortgage payment.
- Property-tax allowance.
- Optional City water, wastewater, stormwater and waste-collection costs.
- Editable water consumption.
- Editable condo fees, insurance, maintenance and energy budgets.
- Monthly cost breakdown.
- Identification of cost categories still left unconfirmed.
- Five-year mortgage-renewal scenario with an adjustable renewal rate.
- Estimated Alberta property-transfer and mortgage-registration fees.

These are planning calculations, not lender approvals or confirmed ownership bills. The starting purchase price uses the assessment as an illustration and can be changed.

</details>

<details>
<summary><strong>7. Neighbourhood overview and census information</strong></summary>

- A consolidated overview of assessments, tax, mobility, everyday amenities, schools, environment, infrastructure and representation.
- Population in private households.
- Number of private households.
- Average household size.
- One-person-household share.
- Age distribution.
- Household-size composition.
- Expandable detail and links to fuller official community profiles.

Census information is historical 2021 data, with its geographic and methodological limitations shown. It excludes collective dwellings and doesn't describe individual residents.

</details>

<details>
<summary><strong>8. Neighbourhood Finder</strong></summary>

- Search across 223 residential-neighbourhood profiles.
- Set an optional assessment budget.
- Require the neighbourhood median to fall within that budget.
- Choose any combination of NW, NE, SW and SE.
- Set a maximum distance from downtown.
- Require proximity to a particular neighbourhood.
- Set each priority to Off, Low, Medium or High: assessment budget, everyday amenities, transit, parks, schools and downtown proximity.
- Choose the school level relevant to the search.
- Receive up to five recommended neighbourhoods.
- See match scores, reasons, compromises and data coverage.
- Inspect the evidence and contribution of each priority.
- See assessment medians, account counts and the middle-half assessment range.
- See how many neighbourhoods meet the chosen limits and have enough data to score.
- Inspect nearby misses and which constraints they fail.
- Explicit options to widen an overly restrictive search.
- Explore a result on the map.
- Compare the top three results.
- Update or reset preferences.
- Separate preferences and results views on mobile.

Matching runs locally in the browser. It is a transparent scoring system, not an AI recommendation service or a search of homes currently for sale. Assessment summaries are available for 219 of the 223 profiles. Distances are straight-line measurements between reference points. Demographics, politics, crime and radon aren't ranking inputs.

</details>

<details>
<summary><strong>9. Walkability, transit and downtown access</strong></summary>

- Walkability estimate out of 100.
- Transit-access estimate out of 100.
- Coverage and calculation explanations for both scores.
- Straight-line distance to downtown, measured to Calgary Tower.
- Nearest CTrain platform, line and distance.
- Nearest bus stop, stop number, routes and distance.
- Weekday route count within 800 metres.
- Weekday, Saturday and Sunday schedule comparisons.
- Route directions and destinations.
- Nearest served stop for each route.
- Scheduled daily boardings.
- Midday departures per hour.
- First and last scheduled boarding times.
- Links to Calgary Transit's current trip planner and service alerts.

Distances are straight-line measurements, not walking routes or commute times. The scores are the app's own estimates, not proprietary Walk Score or Transit Score ratings. They use the selected property's map point or a neighbourhood reference point; whole quadrants don't receive a single mobility score.

</details>

<details>
<summary><strong>10. Nearby everyday amenities</strong></summary>

Find mapped locations and distances for:

- Grocery stores
- Convenience stores
- Parks
- Schools
- Pharmacies and healthcare
- Libraries and community facilities
- Child-care centres
- Gyms and fitness centres
- Preschools and kindergartens
- Sports and recreation facilities

Includes individual source links, downloadable amenity extracts and a link to Alberta's child-care licensing and inspection search. Mapped presence doesn't confirm opening hours or availability.

</details>

<details>
<summary><strong>11. School directory</strong></summary>

- 499 school records, excluding postsecondary sites.
- Elementary, junior-high, high-school and unclassified filters.
- Search by school name or board.
- Browse schools inside the selected neighbourhood or quadrant.
- Browse nearby schools within 3, 5 or 10 kilometres, or across Calgary.
- Closest-first results.
- School name, board, published grade information, address and distance.
- Identification of schools outside the selected area.
- Location-discrepancy notes where reviewed.
- School websites and source-record links where available.
- Expand from the first eight results to the full result list.
- Overview showing the nearest school for each grade group.
- Links to CBE, Calgary Catholic and FrancoSud school finders.

Proximity doesn't establish designated-school eligibility, capacity, program availability or school quality. Schools can appear in more than one grade group, and some records represent online or special-program offices.

</details>

<details>
<summary><strong>12. Sunlight and property orientation</strong></summary>

- Calculate the sun's position from the selected property's coordinates.
- Choose a date.
- Today, summer and winter presets.
- Time-of-day slider in 15-minute steps.
- Compass showing sun direction.
- Sun bearing and elevation.
- Daily sun-height chart.
- Sunrise, sunset and total daylight.
- Summer-versus-winter daylight and maximum-sun-height comparison.
- Choose among eight window or garden orientations.
- Orientation guidance and whether the sun is in front of that selected direction.

It doesn't infer window direction or model shadows from buildings, trees or terrain. These are approximate sunlight-planning calculations, not an energy-yield or solar-panel design tool.

</details>

<details>
<summary><strong>13. Air quality and radon</strong></summary>

- Calgary AQHI reading and risk category.
- Observation timestamp.
- Live AQHI refresh.
- Dated fallback observation if refresh fails.
- Recent saved AQHI chart and exact-value table.
- Individual monitoring-station readings.
- Historical daily PM₂.₅ charts.
- Station selector for Central Inglewood, Southeast and Varsity.
- Gaps retained for incomplete observation days.
- Historical Calgary-region radon sample summary.
- Radon methodology, testing and mitigation resources.
- Links to official guidance and newer research.

Air readings describe the city or monitoring station. The PM₂.₅ chart is a fixed 13 August–12 September 2026 snapshot. Radon data describes a historical 2012–2013 regional sample, not an individual neighbourhood or home.

</details>

<details>
<summary><strong>14. Water infrastructure</strong></summary>

- Public service-connection material where available.
- Exact-address versus possible building-match labels.
- Recorded installation date and diameter where available.
- Supplementary City record lookups.
- Community water-main material composition.
- Main-segment counts.
- Full material breakdown.
- Recorded main-break counts since 2021.
- Mapped mains and break locations.

Detailed community summaries cover Hillhurst, Sunnyside, Bridgeland/Riverside and Beltline. These records don't identify private interior plumbing or predict replacement requirements.

</details>

<details>
<summary><strong>15. Crime information</strong></summary>

- Link to current official CPS community statistics.
- Historical 2018–2019 community crime counts.
- Annual comparisons where the data is complete.
- Monthly comparison charts.
- Exact-value tables.
- Category breakdowns.
- Historical map shading.
- Explanations of coverage, exclusions and missing periods.

There is no current safety rating or live incident feed. The historical extract covers selected crime categories; incomplete comparisons are suppressed.

</details>

<details>
<summary><strong>16. Representatives and political history</strong></summary>

- Property-based federal, provincial and municipal district matching.
- MP and councillor details from dated records.
- Party affiliation where provided.
- Official representative-profile links.
- Provincial district identification and links to the current MLA directory.
- Warnings where neighbourhoods cross electoral boundaries.
- Candidate votes, vote shares, elected indicators and turnout for supported election results.
- Earlier-election timelines with winning candidate, party and vote share.
- Federal boundary-change notices.

Election history covers the supported Calgary Centre, Calgary Confederation, Calgary-Buffalo and Calgary-Mountain View ridings. Results describe whole electoral districts, not neighbourhood voting. Current MLA names are linked externally rather than reproduced.

</details>

<details>
<summary><strong>17. Development and environmental checks</strong></summary>

- Development-application counts and expandable records.
- Application address, identifier, date, status, category and description.
- Residential-application filter.
- Option to exclude cancelled and refused applications.
- Links to the official development map.
- Park-feature counts, approximate pathway lengths and named parks where covered.
- Separate regulatory-flood and flood-hazard views.
- Airport Noise Exposure Forecast contours.
- Links to exact-address flood tools and the waste-collection calendar.
- Address-specific research prompts for insurance, noise, air and other checks.

Development records currently cover the four detailed study communities. Noise contours are planning forecasts, not live decibel measurements. Missing flood geometry doesn't establish that a home is flood-free or determine insurance eligibility.

</details>

<details>
<summary><strong>18. Save, compare, share and print</strong></summary>

- Save up to 30 properties or neighbourhoods in the browser.
- Reopen and remove saved places.
- Compare up to three places side by side.
- Compare available assessment, tax, construction year, historical crime, main breaks, public service material, AQHI and mobility information.
- Horizontally scroll comparisons on mobile while retaining metric labels.
- Print comparisons.
- Copy a link to a selected neighbourhood or property and data section.
- Generate a research brief with figures, context, sources and limitations.
- Print or save the brief as a PDF.
- Locally saved eight-item buying checklist covering radon, daylight, inspection, documents, flood/insurance, schools, condo documents and visits.
- Checklist completion counter.

Saves and checklists belong to the current browser; there is no account or cross-device sync. Aerial imagery is excluded from printable briefs.

</details>

<details>
<summary><strong>19. Sources, privacy and usability</strong></summary>

- Sources organised by category.
- Publisher, observation period, geographic scope and method for each source.
- Contextual links from figures to their relevant source.
- Expandable limitations and methodology.
- Source-data downloads, reuse register and third-party notices.
- About page with Abdullah Zubair's name, LinkedIn and GitHub.
- Privacy policy, terms and contact address.
- Clear saved places and checklists from the browser.
- No account requirement, advertising or visitor analytics.
- Responsive desktop, tablet, portrait-phone and landscape-phone layouts.
- Compact place card, map-and-cards preview and optional full-screen details.
- Preservation of report position when returning from Sources.
- Keyboard navigation, focus indicators, labelled controls and reduced-motion support.
- Ctrl/Cmd + K search shortcut.
- Chart axes and expandable exact-value tables for supported charts.
- Small expandable map-attribution control.
- Consistent, self-hosted Lil Grotesk typography.

Hosting, search and map requests still involve service providers. Local saves don't mean the website processes no data; the privacy policy explains those requests and provider logs.

</details>

<details>
<summary><strong>20. Engineering and maintenance</strong></summary>

- Public GitHub source.
- Next.js, React, TypeScript, MapLibre and Three.js.
- Git-connected Vercel production deployments.
- Automated type checking, linting, 132 tests, data reconciliation and source-file integrity checks.
- Daily upstream assessment-source monitoring, with review warnings and failure reporting.
- Published data is reviewed rather than automatically overwritten.
- APIs for address assessments, map-property selection, property details and AQHI refresh.
- Compatible browser-agent tools for reading the selection, selecting places, changing layers and comparing places.

</details>

Not currently included: MLS listings, asking prices, last-sale dates/prices, live traffic, turn-by-turn routing, live transit tracking, property-specific radon readings, private-plumbing identification, school-quality rankings or reliable property-value forecasts.

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
