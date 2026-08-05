import { isValidUsername } from './block-config';
import type { CacheEntry, FilmEntry } from './types';

export type CacheSource = 'cache' | 'network' | 'stale';

export interface CacheResult {
	films: FilmEntry[];
	fetchedAt: number;
	source: CacheSource;
	error?: unknown;
}

type FetchFilms = () => Promise<FilmEntry[]>;
type PersistCache = (cache: Record<string, CacheEntry>) => Promise<void>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeUrl(value: unknown, type: 'entry' | 'poster'): value is string {
	if (typeof value !== 'string') return false;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:') return false;
		const host = url.hostname.toLowerCase();
		return type === 'entry'
			? host === 'letterboxd.com' || host === 'www.letterboxd.com'
			: host === 'ltrbxd.com' || host.endsWith('.ltrbxd.com') ||
				host === 'letterboxd.com' || host.endsWith('.letterboxd.com');
	} catch {
		return false;
	}
}

function isFilmEntry(value: unknown): value is FilmEntry {
	if (!isRecord(value)) return false;
	return typeof value.title === 'string' && value.title.length > 0 && value.title.length <= 500 &&
		(value.year === null || (typeof value.year === 'number' && Number.isInteger(value.year))) &&
		typeof value.watchedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.watchedDate) &&
		(value.rating === null || (typeof value.rating === 'number' && value.rating >= 0.5 && value.rating <= 5)) &&
		isSafeUrl(value.letterboxdUrl, 'entry') &&
		(value.tmdbId === null || (typeof value.tmdbId === 'number' && Number.isSafeInteger(value.tmdbId))) &&
		(value.posterUrl === null || isSafeUrl(value.posterUrl, 'poster')) &&
		(value.guid === null || typeof value.guid === 'string') &&
		(value.publishedAt === null || typeof value.publishedAt === 'string');
}

export function normalizeCache(value: unknown): Record<string, CacheEntry> {
	if (!isRecord(value)) return {};
	const cache: Record<string, CacheEntry> = {};
	for (const [username, rawEntry] of Object.entries(value)) {
		if (!isValidUsername(username) || !isRecord(rawEntry)) continue;
		if (typeof rawEntry.fetchedAt !== 'number' || !Number.isFinite(rawEntry.fetchedAt)) continue;
		if (!Array.isArray(rawEntry.films)) continue;
		const films = rawEntry.films.slice(0, 50).filter(isFilmEntry);
		if (films.length !== rawEntry.films.length) continue;
		cache[username.toLowerCase()] = { films, fetchedAt: rawEntry.fetchedAt };
	}
	return cache;
}

export class FeedCache {
	private entries: Record<string, CacheEntry>;
	private readonly inFlight = new Map<string, Promise<CacheResult>>();

	constructor(
		initialEntries: Record<string, CacheEntry>,
		private readonly persist: PersistCache,
		private readonly now: () => number = Date.now,
	) {
		this.entries = initialEntries;
	}

	getEntries(): Record<string, CacheEntry> {
		return this.entries;
	}

	async get(
		username: string,
		maxAgeMilliseconds: number,
		fetchFilms: FetchFilms,
		force = false,
	): Promise<CacheResult> {
		const key = username.toLowerCase();
		const cached = this.entries[key];
		if (!force && cached && this.now() - cached.fetchedAt < maxAgeMilliseconds) {
			return { ...cached, source: 'cache' };
		}

		const existing = this.inFlight.get(key);
		if (existing) return existing;

		const request = this.fetchAndStore(key, cached, fetchFilms);
		this.inFlight.set(key, request);
		try {
			return await request;
		} finally {
			this.inFlight.delete(key);
		}
	}

	private async fetchAndStore(
		key: string,
		cached: CacheEntry | undefined,
		fetchFilms: FetchFilms,
	): Promise<CacheResult> {
		try {
			const films = await fetchFilms();
			const entry = { films, fetchedAt: this.now() };
			this.entries[key] = entry;
			await this.persist(this.entries);
			return { ...entry, source: 'network' };
		} catch (error) {
			if (cached) return { ...cached, source: 'stale', error };
			throw error;
		}
	}

	async clear(): Promise<void> {
		this.entries = {};
		await this.persist(this.entries);
	}
}
