import { requestUrl } from 'obsidian';
import { isValidUsername } from './block-config';
import { parseLetterboxdRss, RssParseError } from './rss-parser';
import type { FilmEntry } from './types';

export type FeedErrorCode = 'invalid-username' | 'bad-user' | 'timeout' | 'offline' | 'malformed-feed';

export class FeedError extends Error {
	constructor(
		public readonly code: FeedErrorCode,
		message: string,
	) {
		super(message);
		this.name = 'FeedError';
	}
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(() => {
			reject(new FeedError('timeout', 'Letterboxd did not respond before the timeout.'));
		}, milliseconds);

		void promise.then(
			(value) => {
				window.clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				window.clearTimeout(timer);
				reject(error instanceof Error ? error : new Error('The request failed.'));
			},
		);
	});
}

export async function fetchLetterboxdFeed(username: string, timeoutSeconds: number): Promise<FilmEntry[]> {
	if (!isValidUsername(username)) {
		throw new FeedError('invalid-username', 'Enter a valid Letterboxd username.');
	}

	let response;
	try {
		response = await withTimeout(
			requestUrl({
				url: `https://letterboxd.com/${username}/rss/`,
				method: 'GET',
				throw: false,
			}),
			timeoutSeconds * 1_000,
		);
	} catch (error) {
		if (error instanceof FeedError) throw error;
		throw new FeedError('offline', 'Could not reach Letterboxd.');
	}

	if (response.status === 404 || response.status === 410) {
		throw new FeedError('bad-user', 'Letterboxd could not find that user.');
	}
	if (response.status === 408 || response.status === 504) {
		throw new FeedError('timeout', 'Letterboxd did not respond before the timeout.');
	}
	if (response.status < 200 || response.status >= 300) {
		throw new FeedError('offline', `Letterboxd returned HTTP ${response.status}.`);
	}
	if (response.text.length > 2_000_000) {
		throw new FeedError('malformed-feed', 'The Letterboxd feed was unexpectedly large.');
	}

	try {
		return parseLetterboxdRss(response.text);
	} catch (error) {
		if (error instanceof RssParseError) {
			throw new FeedError('malformed-feed', error.message);
		}
		throw error;
	}
}
