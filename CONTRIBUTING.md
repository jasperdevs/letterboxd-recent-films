# Contributing

Thanks for helping improve Letterboxd Recent Films.

## Development setup

1. Fork and clone the repository.
2. Install Node.js 20 or newer.
3. Run `npm install`.
4. Run `npm run check` before opening a pull request.

Use `npm run dev` for a watch build while testing in a development vault. Copy or link this repository into `.obsidian/plugins/letterboxd-recent-films/`, reload Obsidian, and enable the plugin.

## Expectations

- Keep changes focused and compatible with Obsidian desktop and mobile.
- Use Obsidian's `requestUrl` API for network requests.
- Do not add telemetry, authentication, cookies, page scraping, private APIs, or Node-only runtime APIs.
- Never render RSS description HTML. Add local, fictional fixtures for parser behavior.
- Do not use live Letterboxd requests in automated tests.
- Update the README and changelog when user-visible behavior changes.

By contributing, you agree that your contribution is licensed under the MIT License.
