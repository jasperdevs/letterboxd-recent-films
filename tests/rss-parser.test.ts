import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractPosterUrl, parseLetterboxdRss, RssParseError } from '../src/rss-parser';

function fixture(name: string): string {
	return readFileSync(join(process.cwd(), 'tests', 'fixtures', name), 'utf8');
}

describe('Letterboxd RSS parsing', () => {
	const films = parseLetterboxdRss(fixture('recent.xml'));

	it('filters non-diary items, removes duplicates, keeps rewatches, and sorts newest first', () => {
		expect(films).toHaveLength(3);
		expect(films.map((film) => `${film.title}:${film.watchedDate}`)).toEqual([
			'Movie Alpha:2026-07-03',
			'Movie Beta:2026-07-02',
			'Movie Alpha:2026-06-01',
		]);
	});

	it('extracts titles, years, dates, ratings, links, TMDB IDs, and trusted posters', () => {
		expect(films[0]).toMatchObject({
			title: 'Movie Alpha',
			year: 2024,
			watchedDate: '2026-07-03',
			rating: 4.5,
			letterboxdUrl: 'https://letterboxd.com/example_user/film/movie-alpha/',
			tmdbId: 100,
		});
		expect(films[0]?.posterUrl).toBe('https://a.ltrbxd.com/resized/poster-alpha.jpg?v=one&size=large');
	});

	it('falls back to title stars for ratings and rejects untrusted poster hosts', () => {
		expect(films[1]?.rating).toBe(3.5);
		expect(films[1]?.posterUrl).toBeNull();
	});

	it('extracts only an image URL from description HTML', () => {
		expect(extractPosterUrl('<script>alert(1)</script><img src="https://a.ltrbxd.com/poster.jpg">')).toBe(
			'https://a.ltrbxd.com/poster.jpg',
		);
		expect(extractPosterUrl('<img src="javascript:alert(1)">')).toBeNull();
	});

	it('rejects malformed XML', () => {
		expect(() => parseLetterboxdRss(fixture('malformed.xml'))).toThrow(RssParseError);
		expect(() => parseLetterboxdRss('<html><body>not a feed</body></html>')).toThrow(RssParseError);
	});
});
