import { describe, expect, it, vi } from 'vitest';
import { FeedCache } from '../src/cache';
import type { FilmEntry } from '../src/types';

const film: FilmEntry = {
	title: 'Fixture Film',
	year: 2020,
	watchedDate: '2026-01-02',
	rating: 4,
	letterboxdUrl: 'https://letterboxd.com/example_user/film/fixture-film/',
	tmdbId: 123,
	posterUrl: 'https://a.ltrbxd.com/fixture.jpg',
	guid: 'fixture-entry',
	publishedAt: 'Fri, 2 Jan 2026 12:00:00 +0000',
};

describe('feed cache', () => {
	it('uses a fresh entry and refreshes it after expiry', async () => {
		let now = 1_000;
		const persist = vi.fn(async () => undefined);
		const fetchFilms = vi.fn(async () => [{ ...film, title: 'Fresh Film' }]);
		const cache = new FeedCache(
			{ example_user: { films: [film], fetchedAt: 900 } },
			persist,
			() => now,
		);

		expect((await cache.get('example_user', 200, fetchFilms)).source).toBe('cache');
		expect(fetchFilms).not.toHaveBeenCalled();

		now = 1_101;
		const refreshed = await cache.get('example_user', 200, fetchFilms);
		expect(refreshed.source).toBe('network');
		expect(refreshed.films[0]?.title).toBe('Fresh Film');
		expect(persist).toHaveBeenCalledOnce();
	});

	it('shares one in-flight request for duplicate blocks', async () => {
		let release: ((films: FilmEntry[]) => void) | undefined;
		const pending = new Promise<FilmEntry[]>((resolve) => { release = resolve; });
		const fetchFilms = vi.fn(() => pending);
		const cache = new FeedCache({}, async () => undefined);

		const first = cache.get('example_user', 1_000, fetchFilms);
		const second = cache.get('EXAMPLE_USER', 1_000, fetchFilms);
		expect(fetchFilms).toHaveBeenCalledOnce();
		release?.([film]);

		expect((await first).films).toEqual([film]);
		expect((await second).films).toEqual([film]);
	});

	it('keeps the last good result when a refresh fails', async () => {
		const cache = new FeedCache(
			{ example_user: { films: [film], fetchedAt: 1 } },
			async () => undefined,
			() => 10_000,
		);
		const result = await cache.get('example_user', 100, async () => {
			throw new Error('offline');
		});
		expect(result.source).toBe('stale');
		expect(result.films).toEqual([film]);
	});

	it('keeps a saved result indefinitely for manual refresh policy', async () => {
		const fetchFilms = vi.fn(async () => [film]);
		const cache = new FeedCache(
			{ example_user: { films: [film], fetchedAt: 1 } },
			async () => undefined,
			() => 999_999,
		);
		const result = await cache.get('example_user', Number.POSITIVE_INFINITY, fetchFilms);
		expect(result.source).toBe('cache');
		expect(fetchFilms).not.toHaveBeenCalled();
	});
});
