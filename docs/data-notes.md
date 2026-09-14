# Data notes

The bundled snapshot was researched and reviewed on 13–14 September 2026. That is a review date, not a claim that every record describes September 2026. The source cards and individual files in [`public/data`](../public/data) carry the fuller metadata.

## Geography and properties

There are 313 official community areas and four openly licensed quadrant polygons. The quadrant geometry is dated July 2021. A community boundary, address quadrant and electoral district describe different things; they aren't interchangeable.

The 2026 residential assessment summary covers 499,477 eligible unique accounts across 248 communities and four address quadrants. The app bundles 199 property examples and uses the City open API for live address searches. The [extraction record](assessment-extraction.json) documents the cohort, pagination, deduplication and reconciliation.

Selected property assessment histories cover 2017–2026. Repeated parcel rows are not added together, conflicting annual values stay unresolved, and missing years remain gaps. Assessments are not sale prices, equity estimates or historical tax bills.

## Ownership costs

Tax calculations start with the published 2026 residential rates. Future-year scenarios are adjustable estimates. Mortgage calculations use Canadian fixed-rate compounding; the planner also includes minimum down payments, eligible insurance illustrations, renewal sensitivity, utility budgets and one-title registration estimates.

The figures depend on the inputs and stated eligibility assumptions. An unknown fee or property-specific cost stays unconfirmed. Before moving to a new assessment year, check the final tax rate as well as the assessment data. See [ownership methodology](../public/data/ownership-methodology.json).

## Census, amenities and transit

Census context uses the City's open 2021 population/age and families/households datasets. It does not fill missing income, tenure or shelter-cost fields from unlicensed profile extracts.

The transit snapshot includes 6,214 stops, routes and scheduled service. Its calendar envelope runs from 9 September to 20 December 2026; that doesn't mean every route operates every day. The comparison reference dates are Tuesday 15 September, Saturday 26 September and Sunday 20 September. The later Saturday avoids special LRT timetables on 12 and 19 September.

Amenities combine identified City sources with separately attributed OpenStreetMap extracts. Walking and transit access measures are explained estimates, not proprietary Walk Score or Transit Score ratings. Distance to Calgary Tower is straight-line distance, not a route or commute prediction.

## Crime, water and air

Crime data contains historical **2018–2019** selected-category counts from the City's open dataset. Incomplete totals and comparisons are suppressed. Current CPS reports are external links, and the app doesn't turn historical counts into a current safety rating.

Water-service lookups preserve exact-address and possible building matches and the published material descriptions. Detailed water-main and break extracts cover **Hillhurst, Sunnyside, Bridgeland/Riverside and Beltline**. Public records don't establish the materials or condition of private service lines and interior plumbing.

The bundled AQHI observation is dated 13 September 2026 at 1 p.m. MDT, with a live Environment and Climate Change Canada refresh available. PM2.5 station readings cover 13 August through 12 September 2026, with completeness checks. Source calendar dates are kept as supplied when the timezone isn't documented. City and station measurements aren't property-level exposure estimates.

## Development, environment and imagery

Development applications cover 13 September 2025 through 12 September 2026 in the four study communities: 178 records for the stated query. Application status is the value at retrieval. An application or approval doesn't establish that construction has started, and both September buckets are partial months.

The flood extracts retain their limited coverage around those communities. Generalized map polygons aren't parcel-level flood or insurance determinations. Airport noise contours are planning constraints expressed as a Noise Exposure Forecast index, not current sound measurements.

The aerial mosaic uses 2025 imagery, with source flight dates of 1 July, 8 July and 12 August. It is directly viewed through the City's hosted service and is excluded from downloadable data and briefs. The 3D buildings are separate vector geometry, not photorealistic meshes.

## Representatives and elections

The snapshot includes 11 federal representatives checked on 13 September 2026 and 14 municipal representatives checked on 14 September. The 26 provincial districts link to the Assembly's current MLA directory instead of reproducing its officeholder roster.

Election comparisons cover the districts relevant to the four study communities: Calgary Centre, Calgary Confederation, Calgary-Buffalo and Calgary-Mountain View. Federal history includes the 2019, 2021 and 2025 elections; provincial history includes 2019 and 2023. These are district results, not neighbourhood voting totals. The federal boundary change before the 2025 election is marked, and current officeholder affiliation is kept separate from historical election labels.

## Updating a snapshot

Review the upstream data and its reuse terms before replacing a file. Update its period, coverage, source cards and [manifest hashes](data-manifest.json) together, then run the project checks. Live endpoints should return a dated result or an unavailable state, never quietly relabel a saved observation as fresh.

The [source licence register](../public/data/rights-register.json), [public-sharing review](../public/PUBLIC-SHARING-REVIEW.md) and [third-party notices](../public/THIRD-PARTY-NOTICES.txt) explain the source-specific conditions. Keep attribution and limitations attached to copies and exports.
