# Usability checks

Last checked: 22 September 2026. These are repeatable journeys, not a claim that every browser or device has been tested.

## Search, map and cards

Run these without reloading between steps:

1. Open Hillhurst's details, search Auburn Bay, then select it. The title, figures, boundary and map position should all change to Auburn Bay.
2. Expand the cards to full screen. Search for `1768 7 Ave NW`, open the record, then search Bowness. Each result should restore the map-and-cards view. The property marker should clear when the neighbourhood opens.
3. Pan away from a selected neighbourhood, then select that same neighbourhood through search. The map should return to it and the details should start at the top.
4. Open a landmark or the planned Green Line, then choose another neighbourhood before the animation finishes. The latest selection should win, including after a route or landmark finishes loading.
5. Change the card size, rotate the viewport or switch 2D/3D during a map flight. The map should finish at the selected place; layout and perspective changes must not stop it halfway.
6. Search `NE`, `North East` and `Northeast Calgary`. Northeast Calgary should come first. Missing source fields must not crash results or appear as searchable text.

The map reserves room for the cards using persistent edge padding. MapLibre adds per-fit padding to that existing space, so neighbourhood and route fits use zero additional padding. On small screens, counting it twice can leave no available map area and silently keep the previous view.

## Research across views

- Select a property, inspect its assessment history, open Nearby, enable train and bus layers, and switch between school and transport details. The origin and displayed distances should continue to refer to the selected property.
- In Find, enter an assessment budget and quadrant preference, generate a shortlist, compare the top three, close the comparison and explore a result. The map should select that result.
- Return to Find. The preferences and results should remain. Open Sources and use its contextual back button to return to the finder.
- Save a place, open Saved, explore it, open the comparison and remove the temporary save. Comparison members can include unsaved finder results; the button says “Open comparison” for this reason.
- Check search and calculator keyboard dismissal, panel scroll reset, horizontal scrolling in the comparison, and source links.

## Verification record

The original failures were reproduced in the deployed app: mobile area changes updated the cards while leaving the map behind; repeating the same search after panning did not recenter on desktop; `NE` could crash when a park record had no planning sector.

The corrected local build passed those portrait and desktop journeys at 390 × 844 and 1280 × 720. Further checks at 320 × 568 and 844 × 390 covered repeated searches, saved comparisons, returning from Sources, and rotation during a neighbourhood flight. Rotation refits the selected place within the visible map area. The compact transit legend leaves room for the map and its attribution control. No browser errors or warnings were recorded in these checks. These are browser viewport checks, not physical-device certification.

Automated checks: TypeScript, ESLint, 141 tests, data validation and the production build passed. Regression tests cover repeated padded map fits, missing community fields, quadrant aliases and search ordering. Existing tests continue to cover property lookup, school distances, transit, calculations and source contracts.
