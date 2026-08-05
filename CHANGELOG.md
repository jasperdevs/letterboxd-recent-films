# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Fixed

- Ignore superseded setting refreshes so rapid changes cannot restore an outdated collage.
- Make Movies shown final: render only the newest selected entries with no pagination, arrows, or hidden pages.
- Fit every selected poster into single-row layouts without horizontal scrolling, clipping, or edge fades.
- Use compact sliders for movie count and poster size instead of long option menus.
- Balance responsive grids evenly and keep the default collage flush, with optional spacing.
- Keep grid collages inside the note when Obsidian has not reported its final width yet.
- Clarify that posters come directly from Letterboxd RSS and remove custom-poster language.
- Remove detailed-poster mode and its display selector in favor of one poster collage with optional heading and tooltip details.
- Replace ineffective per-poster sizing with a left-aligned gallery-width control and clip the outer collage radius reliably.
- Add automatic sparse/dense sizing plus keyboard-, pointer-, and touch-accessible resize handles with a 10%–100% manual range.
- Keep Movies shown concise at 1–20 entries plus a Max option that uses every RSS entry returned.
- Make complete film information the default hover behavior and use the existing field toggles only for captions below posters.
- Remove manual layout selection in favor of one automatically balanced responsive grid.
- Keep high-resolution caption text readable at every displayed collage size.
- Prevent clicks and cancelled gestures from accidentally changing manual gallery width.
- Make a block-level gallery width select manual sizing unless automatic sizing is explicitly requested.
- Enforce automatic sparse-gallery width with an explicit maximum so one or two posters cannot expand to the note width.

## 1.0.1 - 2026-08-05

### Changed

- Make a single in-memory PNG poster collage the default rendered output.
- Keep every poster region linked to its matching Letterboxd diary entry.
- Add a render-mode setting and block override for switching between the collage image and individual poster cards.
- Make poster-only output the default while retaining optional headings and film information.
- Render galleries directly in Obsidian Live Preview as well as Reading view.
- Wrap collage grids according to the selected poster width instead of shrinking long rows.
- Reuse composed PNGs and stable object URLs across Live Preview remounts to eliminate loading flashes and layout jitter.
- Keep the selected information style authoritative when individual information fields are enabled.
- Isolate collage pointer events from the editor so hover and keyboard focus remain reliable.
- Add poster-only, hover/focus, wrapped-caption, and individual-card information styles.
- Add view, interval, and manual refresh policies with no background polling.
- Add configurable poster gaps and a command to copy the latest collage PNG.
- Hide strip scrollbars while adding mouse-wheel, trackpad, and drag scrolling.
- Add hover/focus previous and next controls that page through every available RSS entry in groups matching the film-count setting.
- Give a one-film detailed card more room for its title and information.
- Grow multi-film grids to use available width and center incomplete final rows for every count from 2–20.
- Keep both navigation arrows and the current page number visible, with unavailable directions clearly disabled.
- Simplify display settings to poster-only collage and information-rich detailed cards.
- Replace the large navigation bar with minimal hover/focus arrows and a compact page indicator.
- Give detailed cards responsive widths, longer titles, cleaner metadata spacing, and a dedicated one-film feature card.
- Make Row and Grid layouts apply to both poster collages and detailed cards.
- Move proportional poster sizing to a persistent slider in plugin settings and use a compact 120 px default.
- Reveal only the enabled film-information fields when a collage poster is hovered or focused.
- Apply the selected corner radius only to the outside of the complete collage, keeping inner poster edges square.
- Remove the poster-derived fake backdrop from one-film layouts.
- Keep one-film pages at the same selected poster size as every other page.
- Use one native Obsidian tooltip per collage poster instead of stacked custom and native tooltips.
- Remove manual row and column controls in favor of a responsive, automatically balanced grid.
- Keep grid posters at their selected size while avoiding one-poster final rows whenever space allows.
- Remove dark card backgrounds from detailed mode and let titles, ratings, years, and dates wrap without clipping.
- Use Obsidian theme variables for navigation controls in both light and dark themes.
- Reorganize settings into clear task-based sections and place feed testing beside the username.
- Make the movies-shown setting the single source of truth while automatically balancing each responsive grid.
- Replace ambiguous overlay arrows with explicit Newer and Older page controls.
- Collapse secondary options behind Show advanced while keeping every existing feature available.
- Keep page contents strictly in RSS order and simplify grid packing to one predictable orphan-avoidance rule.

## 1.0.0 - 2026-08-05

### Added

- `letterboxd-recent` Markdown galleries with strip and responsive grid layouts.
- Safe public RSS parsing for diary metadata and Letterboxd-hosted posters.
- Per-username caching, shared in-flight requests, offline fallback, and explicit error states.
- Global settings, per-block overrides, feed testing, and cache controls.
- Commands for inserting, refreshing, and clearing galleries.
- Local fixture tests, strict TypeScript, ESLint, CI, and automated release artifacts.
