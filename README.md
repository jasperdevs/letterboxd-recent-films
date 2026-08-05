# Letterboxd Recent Films

Show a Letterboxd user's latest public diary entries as clickable movie posters inside any Obsidian note. Galleries can use a horizontal strip or responsive grid, inherit your Obsidian theme, and keep the last successful feed result available offline.

This is an unofficial community plugin. It is not affiliated with, endorsed by, or connected to Letterboxd or Obsidian.

## Install and set up

After installing the plugin, enable **Letterboxd Recent Films** under **Settings → Community plugins**. Open the plugin settings and enter a public Letterboxd username. Usernames are validated using Letterboxd's documented rule: 2–15 letters, numbers, or underscores.

Add an empty block to use all global settings:

````markdown
```letterboxd-recent
```
````

Or override settings for one gallery:

````markdown
```letterboxd-recent
username: movie_fan
count: 6
layout: strip
heading: Recently watched
show-captions: false
show-rating: false
show-date: false
```
````

Posters open the matching Letterboxd diary entry in a new window or browser tab.

## Block options

Block values override global settings. Invalid or unknown values are ignored, except an invalid explicit username is shown as a validation error.

| Option | Values |
| --- | --- |
| `username` | A valid public Letterboxd username |
| `count` | `1`–`20` |
| `layout` | `strip` or `grid` |
| `grid-columns` | `2`–`8` |
| `heading` | Plain text, up to 120 characters |
| `show-heading` | `true` or `false` |
| `show-captions` | `true` or `false` |
| `show-year` | `true` or `false` |
| `show-rating` | `true` or `false` |
| `show-date` | `true` or `false` |
| `poster-size` | `80`, `100`, `120`, `140`, `160`, `180`, `200`, or `220` |
| `corner-radius` | `0`, `4`, `6`, `8`, `12`, or `16` |
| `refresh-interval` | `5`, `15`, `30`, `60`, `180`, `360`, `720`, or `1440` minutes |
| `timeout` | `5`, `10`, `15`, `20`, or `30` seconds |

## Settings

Global settings cover the username, film count, strip/grid layout, grid columns, heading text and visibility, captions, year, rating, watched date, poster size, corner radius, refresh interval, and request timeout.

**Test feed** requests the configured public feed immediately. **Clear cache** removes all saved feed results.

## Commands

- **Insert gallery at cursor** inserts an empty gallery block.
- **Insert gallery at top of current note** places a block after YAML frontmatter when present. It does nothing when the note already contains a `letterboxd-recent` block.
- **Refresh galleries** bypasses the freshness interval and updates all rendered galleries.
- **Clear cache** removes saved RSS results.

## Loading and offline behavior

The plugin requests `https://letterboxd.com/{username}/rss/` with Obsidian's supported `requestUrl` API, which works on desktop and mobile. It caches parsed diary metadata per username and shares one in-flight request between duplicate blocks. When a refresh fails, the last successful result remains visible with an offline notice.

The gallery includes dedicated loading, empty, offline, missing-user, timeout, malformed-feed, and invalid-username states. Missing or failed posters use placeholders. Images are lazy-loaded and are never downloaded into the vault.

## Privacy and security

The plugin sends the configured username to Letterboxd only to request that account's public RSS feed. Poster images are loaded directly from Letterboxd's image hosts by Obsidian. Parsed feed metadata and poster URLs are stored in the plugin's `data.json` so the last good result can work offline; depending on your sync configuration, that file may sync with your vault settings.

There is no login, analytics, telemetry, advertising, cookie access, page scraping, private API use, or remote code. RSS description HTML is never rendered. The parser extracts only trusted HTTPS poster URLs and builds the interface with safe DOM methods.

## Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the release matching the version you want.
2. Create `<your-vault>/.obsidian/plugins/letterboxd-recent-films/`.
3. Copy all three files into that folder.
4. Reload Obsidian, then enable **Letterboxd Recent Films** under **Settings → Community plugins**.

## Development

Node.js 20 or newer and npm are required.

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run dev` watches the TypeScript source and rebuilds `main.js`. Tests use committed local RSS fixtures and never contact Letterboxd. The production build bundles `src/main.ts` to `main.js` and verifies all three required release artifacts.

The project follows the current [official Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin) build shape and [plugin review guidance](https://docs.obsidian.md/oo/plugin).

## Releases

1. Update `CHANGELOG.md`.
2. Run `npm version patch`, `npm version minor`, or `npm version major` as appropriate.
3. Run `npm run check`.
4. Push the commit and exact numeric tag (for example, `1.0.0`, without a `v` prefix).

The release workflow verifies the tag against `manifest.json`, reruns every check, and attaches `main.js`, `manifest.json`, and `styles.css` to the GitHub release.

## License

[MIT](LICENSE) © 2026 Jasper
