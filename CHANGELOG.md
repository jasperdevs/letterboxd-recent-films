# Changelog

All notable changes to this project will be documented in this file.

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
- Add a full-width one-film feature layout with ambient poster artwork and longer title wrapping.
- Grow multi-film grids to use available width and center incomplete final rows for every count from 2–20.
- Keep both navigation arrows and the current page number visible, with unavailable directions clearly disabled.
- Simplify display settings to poster-only collage and information-rich detailed cards.
- Replace overlay arrows with a permanent labeled navigation bar below every paginated gallery.
- Give detailed cards responsive widths, longer titles, cleaner metadata spacing, and a dedicated one-film feature card.

## 1.0.0 - 2026-08-05

### Added

- `letterboxd-recent` Markdown galleries with strip and responsive grid layouts.
- Safe public RSS parsing for diary metadata and Letterboxd-hosted posters.
- Per-username caching, shared in-flight requests, offline fallback, and explicit error states.
- Global settings, per-block overrides, feed testing, and cache controls.
- Commands for inserting, refreshing, and clearing galleries.
- Local fixture tests, strict TypeScript, ESLint, CI, and automated release artifacts.
