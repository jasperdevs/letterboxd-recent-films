import type { FilmEntry } from './types';

export class RssParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RssParseError';
	}
}

function directChildText(element: Element, names: readonly string[]): string | null {
	for (const child of Array.from(element.children)) {
		if (names.includes(child.localName) || names.includes(child.nodeName)) {
			const value = child.textContent?.trim();
			if (value) return value;
		}
	}
	return null;
}

function parseYear(value: string | null): number | null {
	if (!value || !/^\d{4}$/.test(value)) return null;
	const year = Number.parseInt(value, 10);
	return year >= 1870 && year <= 2200 ? year : null;
}

function parseWatchedDate(value: string | null): string | null {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function parseRating(value: string | null, itemTitle: string | null): number | null {
	if (value) {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed) && parsed >= 0.5 && parsed <= 5) return parsed;
	}

	const stars = itemTitle?.match(/ - (★{1,5})(½)?$/u);
	if (!stars) return null;
	return (stars[1]?.length ?? 0) + (stars[2] ? 0.5 : 0);
}

function parsePositiveInteger(value: string | null): number | null {
	if (!value || !/^\d+$/.test(value)) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function allowedLetterboxdUrl(value: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && (url.hostname === 'letterboxd.com' || url.hostname === 'www.letterboxd.com')
			? url.href
			: null;
	} catch {
		return null;
	}
}

function allowedPosterUrl(value: string): string | null {
	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase();
		const trustedHost = host === 'ltrbxd.com' || host.endsWith('.ltrbxd.com') ||
			host === 'letterboxd.com' || host.endsWith('.letterboxd.com');
		return url.protocol === 'https:' && trustedHost ? url.href : null;
	} catch {
		return null;
	}
}

export function extractPosterUrl(description: string | null): string | null {
	if (!description) return null;
	const document = new DOMParser().parseFromString(description, 'text/html');
	const source = document.querySelector('img[src]')?.getAttribute('src');
	return source ? allowedPosterUrl(source) : null;
}

function parseItem(item: Element): FilmEntry | null {
	const title = directChildText(item, ['filmTitle', 'letterboxd:filmTitle']);
	const watchedDate = parseWatchedDate(directChildText(item, ['watchedDate', 'letterboxd:watchedDate']));
	const letterboxdUrl = allowedLetterboxdUrl(directChildText(item, ['link']));
	if (!title || !watchedDate || !letterboxdUrl) return null;

	const itemTitle = directChildText(item, ['title']);
	return {
		title,
		year: parseYear(directChildText(item, ['filmYear', 'letterboxd:filmYear'])),
		watchedDate,
		rating: parseRating(directChildText(item, ['memberRating', 'letterboxd:memberRating']), itemTitle),
		letterboxdUrl,
		tmdbId: parsePositiveInteger(directChildText(item, ['movieId', 'tmdb:movieId'])),
		posterUrl: extractPosterUrl(directChildText(item, ['description'])),
		guid: directChildText(item, ['guid']),
		publishedAt: directChildText(item, ['pubDate']),
	};
}

function publishedTimestamp(value: string | null): number {
	if (!value) return 0;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function parseLetterboxdRss(xml: string): FilmEntry[] {
	const document = new DOMParser().parseFromString(xml, 'application/xml');
	if (document.getElementsByTagName('parsererror').length > 0 || document.documentElement.nodeName === 'parsererror') {
		throw new RssParseError('Letterboxd returned malformed XML.');
	}

	const items = Array.from(document.getElementsByTagName('item'));
	if (!document.querySelector('rss, feed') && items.length === 0) {
		throw new RssParseError('The response is not an RSS feed.');
	}

	const seen = new Set<string>();
	const films: FilmEntry[] = [];
	for (const item of items) {
		const film = parseItem(item);
		if (!film) continue;
		const key = `${film.letterboxdUrl}|${film.watchedDate}`;
		if (seen.has(key)) continue;
		seen.add(key);
		films.push(film);
	}

	return films.sort((left, right) => {
		const dateOrder = right.watchedDate.localeCompare(left.watchedDate);
		return dateOrder !== 0
			? dateOrder
			: publishedTimestamp(right.publishedAt) - publishedTimestamp(left.publishedAt);
	});
}
