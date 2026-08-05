# Letterboxd Recent Films

Show a Letterboxd user's latest public diary entries as a clickable poster collage inside any Obsidian note. By default, the plugin composes the posters into one PNG image in memory and wraps it into as many full-width posters as the note can fit. It can alternatively use a full-size scrolling strip or separate poster cards, add optional film information, inherit your Obsidian theme, and keep the last successful feed result available offline.

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
layout: grid
information-style: none
gap: 2
heading: Recently watched
show-captions: false
show-rating: false
show-date: false
```
````

Posters open the matching Letterboxd diary entry in a new window or browser tab.
The block renders in both Live Preview and Reading view. Switch to Source mode temporarily when you want to edit the raw block configuration.

When the RSS feed contains more entries than `count`, minimal previous/next arrows appear while the gallery is hovered or keyboard-focused. Each step shows the next `count` films and continues until the saved feed has no older entries. The arrows remain visible on touch devices.

Both display styles support a horizontally scrolling **Row** and a height-controlled **Grid**. Choose one to four poster rows; films fill across those rows and continue horizontally rather than creating a tall stack or shrinking the posters. Detailed mode uses transparent poster items whose title and metadata wrap beneath each image. Poster collages remain poster-only; hovering or keyboard-focusing a poster shows one Obsidian tooltip with its enabled information fields. A one-film collage is a centered poster rather than a simulated backdrop.

Use the **Poster size** slider in plugin settings to scale poster width and height proportionally. The default is a compact `120 px`.

## Block options

Block values override global settings. Invalid or unknown values are ignored, except an invalid explicit username is shown as a validation error.

| Option | Values |
| --- | --- |
| `username` | A valid public Letterboxd username |
| `count` | `1`–`20` |
| `layout` | `strip` or `grid` |
| `render-mode` | `collage` for poster-only output or `gallery` for detailed cards |
| `grid-rows` | `1`–`4` poster rows |
| `gap` | `0`, `2`, `4`, or `8` pixels |
| `heading` | Plain text, up to 120 characters |
| `show-heading` | `true` or `false` |
| `show-captions` | `true` or `false` |
| `show-year` | `true` or `false` |
| `show-rating` | `true` or `false` |
| `show-date` | `true` or `false` |
| `poster-size` | `80`, `100`, `120`, `140`, `160`, `180`, `200`, or `220` |
| `corner-radius` | `0`, `4`, `6`, `8`, `12`, or `16` |
| `refresh-interval` | `5`, `15`, `30`, `60`, `180`, `360`, `720`, or `1440` minutes |
| `refresh-policy` | `open`, `interval`, or `manual` |
| `timeout` | `5`, `10`, `15`, `20`, or `30` seconds |

## Settings

Global settings cover the username, films per page, poster-collage or detailed-card display, Row/Grid layout, collage height, poster gap, heading, film-information fields, poster size, corner radius, refresh policy, cache interval, and request timeout. Saved changes refresh open galleries immediately.

**Poster collage** creates one image containing square-cornered inner posters, with the selected corner radius applied only to the outside of the complete collage. Selected film information is available in a single Obsidian tooltip on hover or keyboard focus. **Detailed cards** uses separate poster elements with readable titles and the selected year, rating, and watched-date fields.

Poster URLs are taken directly from the image in each Letterboxd RSS entry. That preserves whichever poster Letterboxd exposes in the feed, but the plugin cannot guarantee that a member's custom-poster choice is represented because Letterboxd does not document that RSS detail. The feed does not provide a separate official backdrop, and the plugin does not request one from TMDB because that would require a separately authenticated API integration.

**Test feed** requests the configured public feed immediately. **Clear cache** removes all saved feed results.

## Commands

- **Insert gallery at cursor** inserts an empty gallery block.
- **Insert gallery at top of current note** places a block after YAML frontmatter when present. It does nothing when the note already contains a `letterboxd-recent` block.
- **Refresh galleries** bypasses the freshness interval and updates all rendered galleries.
- **Clear cache** removes saved RSS results.
- **Copy collage image** copies the latest rendered collage as a PNG when the device clipboard supports images.

## Loading and offline behavior

The plugin requests `https://letterboxd.com/{username}/rss/` with Obsidian's supported `requestUrl` API, which works on desktop and mobile. It caches parsed diary metadata per username and shares one in-flight request between duplicate blocks. It also reuses the same completed collage image and object URL in memory so Live Preview focus changes do not flash a loader, decode another image, or redraw the collage. When a refresh fails, the last successful result remains visible with an offline notice.

The recommended **When a gallery is viewed** refresh policy checks the feed when you open/view a gallery and suppresses duplicate requests caused by quick Live Preview remounts. **After the cache interval** uses the selected freshness interval. **Manual only** uses the last saved result until you run **Refresh galleries**; it still makes an initial request when no saved result exists. None of these policies polls Letterboxd in the background.

In strip layout, posters retain their selected pixel size. Scroll horizontally with a trackpad, the mouse wheel, or click-and-drag; the decorative scrollbar is hidden.

The gallery includes dedicated loading, empty, offline, missing-user, timeout, malformed-feed, and invalid-username states. Missing or failed posters use placeholders. Images are lazy-loaded and are never downloaded into the vault.

## Privacy and security

The plugin sends the configured username to Letterboxd only to request that account's public RSS feed. Poster bytes are requested from Letterboxd's image hosts and combined into the collage in memory. The generated image is not written into the vault. Parsed feed metadata and poster URLs are stored in the plugin's `data.json` so the last good result can work offline; depending on your sync configuration, that file may sync with your vault settings.

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
