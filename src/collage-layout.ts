import type { GalleryConfig } from './types';

const POSTER_ASPECT_RATIO = 1.5;
export const COLLAGE_CAPTION_LINE_HEIGHT = 18;
export const COLLAGE_CAPTION_PADDING = 8;

export interface CollageLayout {
	featured: boolean;
	columns: number;
	rows: number;
	posterWidth: number;
	posterHeight: number;
	captionHeight: number;
	cellHeight: number;
	width: number;
	height: number;
	gap: number;
}

export interface CollageCell {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function responsiveGridColumns(
	availableWidth: number,
	maximum: number,
	posterWidth: number,
	gap: number,
): number {
	const columnsThatFit = Math.floor((Math.max(0, availableWidth) + gap) / (posterWidth + gap));
	return Math.max(1, Math.min(maximum, columnsThatFit));
}

export function getCollageLayout(
	filmCount: number,
	config: GalleryConfig,
	columnOverride?: number,
	availableWidth?: number,
): CollageLayout {
	const safeCount = Math.max(1, filmCount);
	if (safeCount === 1 && config.count === 1) {
		const posterWidth = config.posterSize;
		const posterHeight = Math.round(posterWidth * POSTER_ASPECT_RATIO);
		return {
			featured: false,
			columns: 1,
			rows: 1,
			posterWidth,
			posterHeight,
			captionHeight: 0,
			cellHeight: posterHeight,
			width: posterWidth,
			height: posterHeight,
			gap: 0,
		};
	}
	const columns = config.layout === 'strip'
		? safeCount
		: Math.min(columnOverride ?? config.gridColumns, safeCount);
	const rows = Math.ceil(safeCount / columns);
	const fittedPosterWidth = availableWidth === undefined || config.layout === 'strip'
		? config.posterSize
		: Math.floor((availableWidth - Math.max(0, columns - 1) * config.gap) / columns);
	const posterWidth = Math.min(220, Math.max(config.posterSize, fittedPosterWidth));
	const posterHeight = Math.round(posterWidth * POSTER_ASPECT_RATIO);
	const captionsEnabled = config.informationStyle === 'captions';
	const captionLines = captionsEnabled
		? (config.showCaptions ? 2 : 0) + (config.showYear || config.showRating || config.showDate ? 2 : 0)
		: 0;
	const captionHeight = captionLines > 0
		? captionLines * COLLAGE_CAPTION_LINE_HEIGHT + COLLAGE_CAPTION_PADDING * 2
		: 0;
	const cellHeight = posterHeight + captionHeight;
	const gap = config.gap;
	return {
		featured: false,
		columns,
		rows,
		posterWidth,
		posterHeight,
		captionHeight,
		cellHeight,
		width: columns * posterWidth + Math.max(0, columns - 1) * gap,
		height: rows * cellHeight + Math.max(0, rows - 1) * gap,
		gap,
	};
}

export function getCollageCell(layout: CollageLayout, index: number, filmCount: number): CollageCell {
	if (layout.featured) return { x: 0, y: 0, width: layout.width, height: layout.height };
	const row = Math.floor(index / layout.columns);
	const column = index % layout.columns;
	const isLastRow = row === layout.rows - 1;
	const itemsInRow = isLastRow
		? filmCount - (layout.rows - 1) * layout.columns
		: layout.columns;
	const rowWidth = itemsInRow * layout.posterWidth + Math.max(0, itemsInRow - 1) * layout.gap;
	const rowOffset = (layout.width - rowWidth) / 2;
	return {
		x: rowOffset + column * (layout.posterWidth + layout.gap),
		y: row * (layout.cellHeight + layout.gap),
		width: layout.posterWidth,
		height: layout.cellHeight,
	};
}
