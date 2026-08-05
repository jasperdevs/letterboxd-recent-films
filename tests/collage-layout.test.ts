import { describe, expect, it } from 'vitest';
import { getCollageCell, getCollageLayout, responsiveGridColumns } from '../src/collage-layout';
import { DEFAULT_SETTINGS } from '../src/types';

describe('poster collage layout', () => {
	it('creates one poster-only image row for strip layout', () => {
		const layout = getCollageLayout(6, {
			...DEFAULT_SETTINGS,
			layout: 'strip',
			posterSize: 140,
		});
		expect(layout).toEqual({
			featured: false,
			columns: 6,
			rows: 1,
			posterWidth: 140,
			posterHeight: 210,
			captionHeight: 0,
			cellHeight: 210,
			width: 850,
			height: 210,
			gap: 2,
		});
	});

	it('creates a centered poster instead of a fake backdrop for one film', () => {
		const layout = getCollageLayout(1, { ...DEFAULT_SETTINGS, count: 1 }, 1, 720);
		expect(layout).toMatchObject({
			featured: false,
			width: 140,
			posterWidth: 140,
			posterHeight: 210,
			height: 210,
		});
		expect(getCollageCell(layout, 0, 1)).toEqual({ x: 0, y: 0, width: 140, height: 210 });
	});

	it('centers incomplete final rows instead of leaving an orphan on the left', () => {
		const layout = getCollageLayout(5, { ...DEFAULT_SETTINGS, gap: 4 }, 3);
		expect(getCollageCell(layout, 3, 5).x).toBe(72);
		expect(getCollageCell(layout, 4, 5).x).toBe(216);
	});

	it('grows grid posters to use available width without exceeding the size limit', () => {
		const layout = getCollageLayout(4, { ...DEFAULT_SETTINGS, gap: 4 }, 4, 700);
		expect(layout.posterWidth).toBe(172);
		expect(layout.width).toBe(700);
		const pair = getCollageLayout(2, { ...DEFAULT_SETTINGS, gap: 4 }, 2, 700);
		expect(pair.posterWidth).toBe(220);
		expect(pair.width).toBe(444);
	});

	it('wraps a grid into rows and reserves image space for optional information', () => {
		const layout = getCollageLayout(6, {
			...DEFAULT_SETTINGS,
			layout: 'grid',
			gridColumns: 4,
			posterSize: 140,
			informationStyle: 'captions',
			showCaptions: true,
			showRating: true,
		});
		expect(layout).toMatchObject({
			columns: 4,
			rows: 2,
			captionHeight: 88,
			cellHeight: 298,
			width: 566,
			height: 598,
			gap: 2,
		});
	});

	it('uses six, three, or two columns as the note width changes', () => {
		expect(responsiveGridColumns(900, 6, 140, 4)).toBe(6);
		expect(responsiveGridColumns(500, 6, 140, 4)).toBe(3);
		expect(responsiveGridColumns(320, 6, 140, 4)).toBe(2);
		expect(responsiveGridColumns(700, 6, 140, 4)).toBe(4);
		expect(responsiveGridColumns(100, 6, 140, 4)).toBe(1);
	});
});
