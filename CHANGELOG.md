# Changelog

All notable changes to this project will be documented in this file.

## 1.0.1 - 2026-08-05

### Changed

- Render every gallery as one in-memory PNG poster collage in both Live Preview and Reading view.
- Keep every poster region linked to its matching Letterboxd diary entry with full hover and keyboard information.
- Automatically balance responsive rows while keeping one- and two-poster galleries compact.
- Offer automatic sizing, a 10%–100% manual width, and pointer, touch, and keyboard resizing.
- Limit Movies shown to 1–20 entries plus Max for the complete RSS result, with no pagination or hidden pages.
- Make poster-only output the default while retaining optional heading and under-poster title, year, rating, and date fields.
- Add view, interval, and manual refresh policies with no background polling.
- Add configurable poster gaps, an outer corner radius, and a command to copy the latest collage PNG.
- Reuse completed collages and stable object URLs to prevent Live Preview flashes and layout jitter.

### Fixed

- Prevent rapid setting changes from restoring outdated galleries.
- Keep collages inside the note before Obsidian reports its final layout width.
- Keep sparse galleries from expanding to the full note width.
- Keep high-resolution captions readable after responsive display scaling.
- Prevent clicks and cancelled resize gestures from changing the saved width.
- Apply corner radius only to the outside of the complete collage while inner poster edges remain square.

## 1.0.0 - 2026-08-05

### Added

- `letterboxd-recent` Markdown galleries with strip and responsive grid layouts.
- Safe public RSS parsing for diary metadata and Letterboxd-hosted posters.
- Per-username caching, shared in-flight requests, offline fallback, and explicit error states.
- Global settings, per-block overrides, feed testing, and cache controls.
- Commands for inserting, refreshing, and clearing galleries.
- Local fixture tests, strict TypeScript, ESLint, CI, and automated release artifacts.
