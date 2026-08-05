import { describe, expect, it } from 'vitest';
import { balancedGridColumns, getCollageCell, getCollageLayout, responsiveGridColumns } from '../src/collage-layout';
import { DEFAULT_SETTINGS } from '../src/types';

describe('poster collage layout', () => {
	it('creates a six-poster source row', () => {
		const layout = getCollageLayout(6, DEFAULT_SETTINGS, 6);
		expect(layout).toEqual({
			featured: false,
			columns: 6,
			rows: 1,
			posterWidth: 300,
			posterHeight: 450,
			captionHeight: 0,
			cellHeight: 450,
			width: 1800,
			height: 450,
			gap: 0,
		});
	});

	it('creates a centered poster instead of a fake backdrop for one film', () => {
		const layout = getCollageLayout(1, { ...DEFAULT_SETTINGS, count: 1 }, 1, 720);
		expect(layout).toMatchObject({
			featured: false,
			width: 300,
			posterWidth: 300,
			posterHeight: 450,
			height: 450,
		});
		expect(getCollageCell(layout, 0, 1)).toEqual({ x: 0, y: 0, width: 300, height: 450 });
	});

	it('centers incomplete final rows instead of leaving an orphan on the left', () => {
		const layout = getCollageLayout(5, { ...DEFAULT_SETTINGS, gap: 4 }, 3);
		expect(getCollageCell(layout, 3, 5).x).toBe(152);
		expect(getCollageCell(layout, 4, 5).x).toBe(456);
	});

	it('uses a stable source resolution before responsive display scaling', () => {
		const layout = getCollageLayout(4, { ...DEFAULT_SETTINGS, gap: 4 }, 4, 700);
		expect(layout.posterWidth).toBe(300);
		expect(layout.width).toBe(1212);
		const pair = getCollageLayout(2, { ...DEFAULT_SETTINGS, gap: 4 }, 2, 700);
		expect(pair.posterWidth).toBe(300);
		expect(pair.width).toBe(604);
	});

	it('reserves caption space only for the selected under-poster fields', () => {
		const layout = getCollageLayout(6, {
			...DEFAULT_SETTINGS,
			showCaptions: true,
			showYear: true,
			showRating: true,
		}, 3);
		expect(layout).toMatchObject({
			columns: 3,
			rows: 2,
			captionHeight: 88,
			cellHeight: 538,
			width: 900,
			height: 1076,
			gap: 0,
		});
	});

	it('uses six, three, or two columns as the note width changes', () => {
		expect(responsiveGridColumns(900, 6, 140, 4)).toBe(6);
		expect(responsiveGridColumns(500, 6, 140, 4)).toBe(3);
		expect(responsiveGridColumns(320, 6, 140, 4)).toBe(2);
		expect(responsiveGridColumns(700, 6, 140, 4)).toBe(4);
		expect(responsiveGridColumns(100, 6, 140, 4)).toBe(1);
	});

	it('balances common film counts without creating avoidable orphan rows', () => {
		expect(balancedGridColumns(6, 5)).toBe(3);
		expect(balancedGridColumns(7, 5)).toBe(4);
		expect(balancedGridColumns(8, 5)).toBe(4);
		expect(balancedGridColumns(20, 5)).toBe(5);
	});
});
