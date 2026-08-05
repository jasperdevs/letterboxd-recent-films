import { requestUrl } from 'obsidian';
import {
	COLLAGE_CAPTION_LINE_HEIGHT,
	COLLAGE_CAPTION_PADDING,
	getCollageCell,
	getCollageLayout,
	type CollageLayout,
} from './collage-layout';
import type { FilmEntry, GalleryConfig } from './types';

const MAX_POSTER_BYTES = 10_000_000;

export interface CollageAsset extends CollageLayout {
	blob: Blob;
}

interface LoadedPoster {
	image: HTMLImageElement;
	revoke: () => void;
}

function responseContentType(headers: Record<string, string>): string {
	for (const [name, value] of Object.entries(headers)) {
		if (name.toLowerCase() === 'content-type' && value.toLowerCase().startsWith('image/')) {
			return value.split(';')[0] ?? 'image/jpeg';
		}
	}
	return 'image/jpeg';
}

async function loadPoster(url: string, document: Document): Promise<LoadedPoster> {
	const response = await requestUrl({ url, method: 'GET', throw: false });
	if (response.status < 200 || response.status >= 300 || response.arrayBuffer.byteLength > MAX_POSTER_BYTES) {
		throw new Error('Poster could not be loaded.');
	}

	const blob = new Blob([response.arrayBuffer], { type: responseContentType(response.headers) });
	const urlApi = document.defaultView?.URL ?? URL;
	const objectUrl = urlApi.createObjectURL(blob);
	const image = document.createElement('img');
	try {
		await new Promise<void>((resolve, reject) => {
			image.addEventListener('load', () => resolve(), { once: true });
			image.addEventListener('error', () => reject(new Error('Poster image is invalid.')), { once: true });
			image.src = objectUrl;
		});
		return { image, revoke: () => urlApi.revokeObjectURL(objectUrl) };
	} catch (error) {
		urlApi.revokeObjectURL(objectUrl);
		throw error;
	}
}

function themeValue(styles: CSSStyleDeclaration, property: string, fallback: string): string {
	return styles.getPropertyValue(property).trim() || fallback;
}

function wrappedLines(
	context: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
	maxLines: number,
): string[] {
	const words = text.trim().split(/\s+/);
	const lines: string[] = [];
	for (const word of words) {
		const last = lines.at(-1);
		const candidate = last ? `${last} ${word}` : word;
		if (last && context.measureText(candidate).width > maxWidth) lines.push(word);
		else if (last) lines[lines.length - 1] = candidate;
		else lines.push(candidate);
	}
	if (lines.length <= maxLines) return lines;
	const visible = lines.slice(0, maxLines);
	let finalLine = visible[maxLines - 1] ?? '';
	while (finalLine.length > 1 && context.measureText(`${finalLine}…`).width > maxWidth) {
		finalLine = finalLine.slice(0, -1);
	}
	visible[maxLines - 1] = `${finalLine.trimEnd()}…`;
	return visible;
}

function formatRating(rating: number): string {
	const wholeStars = Math.floor(rating);
	return `${'★'.repeat(wholeStars)}${rating - wholeStars >= 0.5 ? '½' : ''}`;
}

function drawPlaceholder(
	context: CanvasRenderingContext2D,
	film: FilmEntry,
	x: number,
	y: number,
	layout: CollageLayout,
	background: string,
	mutedText: string,
): void {
	context.fillStyle = background;
	context.fillRect(x, y, layout.posterWidth, layout.posterHeight);
	context.fillStyle = mutedText;
	context.font = `600 ${Math.max(28, Math.round(layout.posterWidth / 3))}px sans-serif`;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(film.title.slice(0, 1).toUpperCase() || 'F', x + layout.posterWidth / 2, y + layout.posterHeight / 2);
}

function drawCaption(
	context: CanvasRenderingContext2D,
	film: FilmEntry,
	config: GalleryConfig,
	layout: CollageLayout,
	x: number,
	y: number,
	background: string,
	primaryText: string,
	mutedText: string,
	fontFamily: string,
): void {
	if (layout.captionHeight === 0) return;
	context.fillStyle = background;
	context.fillRect(x, y + layout.posterHeight, layout.posterWidth, layout.captionHeight);
	context.textAlign = 'left';
	context.textBaseline = 'top';
	let lineY = y + layout.posterHeight + COLLAGE_CAPTION_PADDING;
	if (config.showCaptions) {
		context.fillStyle = primaryText;
		context.font = `600 13px ${fontFamily}`;
		for (const line of wrappedLines(
			context,
			film.title,
			layout.posterWidth - COLLAGE_CAPTION_PADDING * 2,
			2,
		)) {
			context.fillText(line, x + COLLAGE_CAPTION_PADDING, lineY);
			lineY += COLLAGE_CAPTION_LINE_HEIGHT;
		}
		lineY = y + layout.posterHeight + COLLAGE_CAPTION_PADDING + COLLAGE_CAPTION_LINE_HEIGHT * 2;
	}

	const details: string[] = [];
	if (config.showYear && film.year) details.push(String(film.year));
	if (config.showRating && film.rating) details.push(formatRating(film.rating));
	if (config.showDate) details.push(film.watchedDate);
	if (details.length > 0) {
		context.fillStyle = mutedText;
		context.font = `12px ${fontFamily}`;
		for (const line of wrappedLines(
			context,
			details.join(' · '),
			layout.posterWidth - COLLAGE_CAPTION_PADDING * 2,
			2,
		)) {
			context.fillText(line, x + COLLAGE_CAPTION_PADDING, lineY);
			lineY += COLLAGE_CAPTION_LINE_HEIGHT;
		}
	}
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error('The poster collage could not be encoded.'));
		}, 'image/png');
	});
}

export async function createPosterCollage(
	films: FilmEntry[],
	config: GalleryConfig,
	document: Document,
	columns?: number,
	availableWidth?: number,
): Promise<CollageAsset> {
	const layout = getCollageLayout(films.length, config, columns, availableWidth);
	const canvas = document.createElement('canvas');
	canvas.width = layout.width;
	canvas.height = layout.height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('This device cannot create a poster collage.');

	const styles = document.defaultView?.getComputedStyle(document.body);
	const background = styles ? themeValue(styles, '--background-secondary', '#262626') : '#262626';
	const primaryText = styles ? themeValue(styles, '--text-normal', '#dcddde') : '#dcddde';
	const mutedText = styles ? themeValue(styles, '--text-muted', '#999999') : '#999999';
	const fontFamily = styles ? themeValue(styles, '--font-interface', 'sans-serif') : 'sans-serif';
	context.fillStyle = background;
	context.fillRect(0, 0, layout.width, layout.height);

	const posterRequests = new Map<string, Promise<LoadedPoster | null>>();
	for (const film of films) {
		if (film.posterUrl && !posterRequests.has(film.posterUrl)) {
			posterRequests.set(film.posterUrl, loadPoster(film.posterUrl, document).catch(() => null));
		}
	}
	const loaded = await Promise.all(Array.from(posterRequests.values()));
	const posters = new Map<string, LoadedPoster | null>();
	Array.from(posterRequests.keys()).forEach((url, index) => posters.set(url, loaded[index] ?? null));

	try {
		films.forEach((film, index) => {
			const cell = getCollageCell(layout, index, films.length);
			const { x, y } = cell;
			const poster = film.posterUrl ? posters.get(film.posterUrl) : null;
			if (poster) context.drawImage(poster.image, x, y, layout.posterWidth, layout.posterHeight);
			else drawPlaceholder(context, film, x, y, layout, background, mutedText);
			drawCaption(context, film, config, layout, x, y, background, primaryText, mutedText, fontFamily);
		});

		const output = await canvasBlob(canvas);
		return { ...layout, blob: output };
	} finally {
		for (const poster of posters.values()) poster?.revoke();
	}
}

export function collageCacheKey(
	films: FilmEntry[],
	config: GalleryConfig,
	columns: number,
	document: Document,
	availableWidth?: number,
): string {
	const styles = document.defaultView?.getComputedStyle(document.body);
	return JSON.stringify({
		films: films.map((film) => [film.posterUrl, film.title, film.year, film.rating, film.watchedDate]),
		columns,
		availableWidth,
		layout: config.layout,
		informationStyle: config.informationStyle,
		showCaptions: config.showCaptions,
		showYear: config.showYear,
		showRating: config.showRating,
		showDate: config.showDate,
		posterSize: config.posterSize,
		gap: config.gap,
		theme: styles ? [
			themeValue(styles, '--background-secondary', '#262626'),
			themeValue(styles, '--text-normal', '#dcddde'),
			themeValue(styles, '--text-muted', '#999999'),
			themeValue(styles, '--font-interface', 'sans-serif'),
		] : ['#262626', '#dcddde', '#999999', 'sans-serif'],
	});
}
