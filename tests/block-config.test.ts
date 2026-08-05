import { describe, expect, it } from 'vitest';
import {
	isValidUsername,
	normalizeSettings,
	parseBlockConfig,
	resolveGalleryConfig,
} from '../src/block-config';
import { DEFAULT_SETTINGS } from '../src/types';

describe('username validation', () => {
	it('accepts the official Letterboxd username character and length rules', () => {
		expect(isValidUsername('ab')).toBe(true);
		expect(isValidUsername('Movie_Fan_2026')).toBe(true);
		expect(isValidUsername('123456789012345')).toBe(true);
	});

	it('rejects unsafe or out-of-range usernames', () => {
		for (const value of ['', 'a', '1234567890123456', 'movie-fan', '../user', 'film fan', 'éclair']) {
			expect(isValidUsername(value)).toBe(false);
		}
	});
});

describe('block parsing', () => {
	it('parses supported overrides and preserves colons in headings', () => {
		expect(parseBlockConfig([
			'username: movie_fan',
			'count: 12',
			'gap: 4',
			'heading: Diary: this week',
			'show-captions: true',
			'show-year: true',
			'show-rating: true',
			'show-date: false',
			'gallery-width: 80',
			'auto-size: false',
			'corner-radius: 12',
			'refresh-interval: 30',
			'refresh-policy: manual',
			'timeout: 15',
		].join('\n'))).toEqual({
			username: 'movie_fan',
			count: 12,
			gap: 4,
			heading: 'Diary: this week',
			showCaptions: true,
			showYear: true,
			showRating: true,
			showDate: false,
			galleryWidth: 80,
			autoSize: false,
			cornerRadius: 12,
			refreshIntervalMinutes: 30,
			refreshPolicy: 'manual',
			timeoutSeconds: 15,
		});
	});

	it('ignores invalid typed values', () => {
		expect(parseBlockConfig('count: 101\nshow-date: sometimes\ngallery-width: 73\ntimeout: 17')).toEqual({});
		expect(parseBlockConfig('count: max')).toEqual({ count: 0 });
	});

	it('treats an explicit gallery width as manual unless auto sizing is also explicit', () => {
		expect(parseBlockConfig('gallery-width: 80')).toEqual({ galleryWidth: 80, autoSize: false });
		expect(parseBlockConfig('gallery-width: 80\nauto-size: true')).toEqual({ galleryWidth: 80, autoSize: true });
	});

	it('uses global settings for an empty block and lets block values override them', () => {
		const settings = { ...DEFAULT_SETTINGS, username: 'global_user', count: 4 };
		expect(resolveGalleryConfig('', settings)).toEqual(settings);
		expect(resolveGalleryConfig('username: block_user\ncount: 8', settings)).toMatchObject({
			username: 'block_user',
			count: 8,
		});
		expect(resolveGalleryConfig('show-rating: true', settings).showRating).toBe(true);
	});
});

describe('settings normalization', () => {
	it('restores safe defaults for invalid persisted values', () => {
		const normalized = normalizeSettings({ count: -1, galleryWidth: 73 });
		expect(normalized.count).toBe(DEFAULT_SETTINGS.count);
		expect(normalized.galleryWidth).toBe(DEFAULT_SETTINGS.galleryWidth);
	});

	it('ignores removed detailed-poster settings', () => {
		expect(normalizeSettings({ removedDisplayStyle: 'cards' })).toEqual(DEFAULT_SETTINGS);
	});
});
