import { requestUrl } from 'obsidian';
import {
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
	const mutedText = styles ? themeValue(styles, '--text-muted', '#999999') : '#999999';
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
		gap: config.gap,
		theme: styles ? [
			themeValue(styles, '--background-secondary', '#262626'),
			themeValue(styles, '--text-muted', '#999999'),
		] : ['#262626', '#999999'],
	});
}
