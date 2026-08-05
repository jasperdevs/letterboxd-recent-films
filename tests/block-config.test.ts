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
			'layout: grid',
			'render-mode: gallery',
			'information-style: hover',
			'grid-columns: 5',
			'gap: 4',
			'heading: Diary: this week',
			'show-captions: true',
			'show-year: true',
			'show-rating: true',
			'show-date: false',
			'poster-size: 180',
			'corner-radius: 12',
			'refresh-interval: 30',
			'refresh-policy: manual',
			'timeout: 15',
		].join('\n'))).toEqual({
			username: 'movie_fan',
			count: 12,
			layout: 'grid',
			renderMode: 'gallery',
			informationStyle: 'hover',
			gridColumns: 5,
			gap: 4,
			heading: 'Diary: this week',
			showCaptions: true,
			showYear: true,
			showRating: true,
			showDate: false,
			posterSize: 180,
			cornerRadius: 12,
			refreshIntervalMinutes: 30,
			refreshPolicy: 'manual',
			timeoutSeconds: 15,
		});
	});

	it('ignores invalid typed values', () => {
		expect(parseBlockConfig('count: 99\nlayout: carousel\nrender-mode: cards\nshow-date: sometimes\nposter-size: 133\ntimeout: 17')).toEqual({});
	});

	it('uses global settings for an empty block and lets block values override them', () => {
		const settings = { ...DEFAULT_SETTINGS, username: 'global_user', count: 4, informationStyle: 'hover' as const };
		expect(resolveGalleryConfig('', settings)).toEqual(settings);
		expect(resolveGalleryConfig('username: block_user\ncount: 8', settings)).toMatchObject({
			username: 'block_user',
			count: 8,
		});
		expect(resolveGalleryConfig('show-rating: true', settings).informationStyle).toBe('hover');
	});
});

describe('settings normalization', () => {
	it('restores safe defaults for invalid persisted values', () => {
		const normalized = normalizeSettings({ count: 0, gridColumns: 50, layout: 'other', posterSize: 133 });
		expect(normalized.count).toBe(DEFAULT_SETTINGS.count);
		expect(normalized.gridColumns).toBe(DEFAULT_SETTINGS.gridColumns);
		expect(normalized.layout).toBe(DEFAULT_SETTINGS.layout);
		expect(normalized.posterSize).toBe(DEFAULT_SETTINGS.posterSize);
	});

	it('migrates the previous gallery and caption settings to information styles', () => {
		expect(normalizeSettings({ renderMode: 'gallery' }).informationStyle).toBe('cards');
		expect(normalizeSettings({ showRating: true }).informationStyle).toBe('none');
	});
});
