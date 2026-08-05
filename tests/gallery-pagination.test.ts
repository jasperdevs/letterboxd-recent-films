import { describe, expect, it } from 'vitest';
import { clampPage, pageCount, pageItems } from '../src/gallery-pagination';

describe('gallery pagination', () => {
	it('pages through every RSS entry in groups matching the film count', () => {
		const entries = Array.from({ length: 14 }, (_, index) => index + 1);
		expect(pageCount(entries.length, 6)).toBe(3);
		expect(pageItems(entries, 0, 6)).toEqual([1, 2, 3, 4, 5, 6]);
		expect(pageItems(entries, 1, 6)).toEqual([7, 8, 9, 10, 11, 12]);
		expect(pageItems(entries, 2, 6)).toEqual([13, 14]);
	});

	it('keeps navigation inside the available feed', () => {
		expect(clampPage(-1, 10, 4)).toBe(0);
		expect(clampPage(99, 10, 4)).toBe(2);
		expect(pageItems([], 4, 6)).toEqual([]);
	});
});
