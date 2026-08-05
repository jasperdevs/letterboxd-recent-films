import { FeedCache, type CacheResult } from './cache';
import { isValidUsername, resolveGalleryConfig } from './block-config';
import {
	collageCacheKey,
	createPosterCollage,
	type CollageAsset,
} from './collage';
import { CollageCache } from './collage-cache';
import { balancedGridColumns, getCollageCell } from './collage-layout';
import { FeedError, fetchLetterboxdFeed } from './rss-client';
import type { FilmEntry, GalleryConfig, PluginSettings } from './types';

type SettingsProvider = () => PluginSettings;
type ResizeCallback = (width: number | null) => Promise<void>;

export class GalleryRuntime {
	readonly collages = new CollageCache();
	private readonly viewedAt = new Map<string, number>();

	markViewed(username: string): boolean {
		const key = username.toLowerCase();
		const previous = this.viewedAt.get(key);
		const now = Date.now();
		if (previous !== undefined && now - previous < 10_000) return false;
		this.viewedAt.set(key, now);
		return true;
	}

	clear(): void {
		this.collages.clear();
		this.viewedAt.clear();
	}
}

function stateMessage(error: unknown): { title: string; detail: string } {
	if (error instanceof FeedError) {
		switch (error.code) {
			case 'invalid-username':
				return { title: 'Check the username', detail: 'Letterboxd usernames use 2–15 letters, numbers, or underscores.' };
			case 'bad-user':
				return { title: 'User not found', detail: 'Check the Letterboxd username and try again.' };
			case 'timeout':
				return { title: 'Letterboxd timed out', detail: 'Try refreshing the gallery in a moment.' };
			case 'malformed-feed':
				return { title: 'Feed could not be read', detail: 'Letterboxd returned an unexpected RSS response.' };
			case 'offline':
				return { title: 'Gallery is offline', detail: 'Connect to the internet and refresh the gallery.' };
		}
	}
	return { title: 'Gallery could not load', detail: 'Try refreshing the gallery in a moment.' };
}

export function formatRating(rating: number): string {
	const wholeStars = Math.floor(rating);
	return `${'★'.repeat(wholeStars)}${rating - wholeStars >= 0.5 ? '½' : ''}`;
}

function formatDate(value: string): string {
	const [year, month, day] = value.split('-').map(Number);
	if (year === undefined || month === undefined || day === undefined) return value;
	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}).format(new Date(year, month - 1, day));
}

function addHeading(container: HTMLElement, config: GalleryConfig): void {
	if (config.showHeading && config.heading.trim()) {
		container.createEl('h3', { cls: 'lrf-heading', text: config.heading.trim() });
	}
}

function renderState(container: HTMLElement, title: string, detail: string): void {
	const state = container.createDiv({ cls: 'lrf-state', attr: { role: 'status' } });
	state.createDiv({ cls: 'lrf-state-title', text: title });
	state.createDiv({ cls: 'lrf-state-detail', text: detail });
}

function applyRootClasses(container: HTMLElement, config: GalleryConfig): void {
	for (const className of Array.from(container.classList)) {
		if (className === 'lrf-root' || className === 'lrf-render-collage' || className.startsWith('lrf-radius-')) {
			container.removeClass(className);
		}
	}
	container.addClass(
		'lrf-root',
		`lrf-radius-${config.cornerRadius}`,
	);
}

function renderLoading(container: HTMLElement, config: GalleryConfig): void {
	container.empty();
	applyRootClasses(container, config);
	addHeading(container, config);
	const status = container.createDiv({ cls: 'lrf-loading-label', text: 'Loading recent films…' });
	status.setAttr('role', 'status');
	const gallery = container.createDiv({ cls: 'lrf-gallery lrf-loading' });
	const loadingCount = config.count === 0 ? 6 : Math.min(config.count, 6);
	for (let index = 0; index < loadingCount; index += 1) gallery.createDiv({ cls: 'lrf-skeleton' });
}

function hoverInformation(film: FilmEntry): { title: string; details: string[] } {
	const details: string[] = [];
	if (film.year) details.push(String(film.year));
	if (film.rating) details.push(formatRating(film.rating));
	details.push(formatDate(film.watchedDate));
	return { title: film.title, details };
}

function selectedFilms(films: FilmEntry[], count: number): FilmEntry[] {
	return count === 0 ? films : films.slice(0, count);
}

function addCacheStatus(container: HTMLElement, result: CacheResult): void {
	if (result.source !== 'stale') return;
	const message = stateMessage(result.error);
	const status = container.createDiv({
		cls: 'lrf-cache-status',
		text: `${message.title}. Showing the last saved gallery.`,
	});
	status.setAttr('role', 'status');
}

function renderEmpty(container: HTMLElement, result: CacheResult, config: GalleryConfig): void {
	container.empty();
	applyRootClasses(container, config);
	addHeading(container, config);
	addCacheStatus(container, result);
	renderState(container, 'No diary entries yet', 'This public RSS feed does not contain any recent diary entries.');
}

function percentage(value: number, total: number): string {
	return `${(value / total) * 100}%`;
}

function renderCollage(
	container: HTMLElement,
	result: CacheResult,
	config: GalleryConfig,
	films: FilmEntry[],
	asset: CollageAsset,
	url: string,
	onResize: ResizeCallback,
): void {
	container.empty();
	applyRootClasses(container, config);
	container.addClass('lrf-render-collage');
	addHeading(container, config);
	addCacheStatus(container, result);
	const scroll = container.createDiv({ cls: 'lrf-collage-scroll' });
	const wrapper = scroll.createDiv({ cls: 'lrf-collage-wrap' });
	const naturalWidth = asset.columns * 132 + Math.max(0, asset.columns - 1) * config.gap;
	wrapper.style.setProperty('width', config.autoSize ? '100%' : `${config.galleryWidth}%`);
	wrapper.style.setProperty('max-width', config.autoSize ? `${naturalWidth}px` : '100%');
	wrapper.createEl('img', {
		cls: 'lrf-collage-image',
		attr: {
			src: url,
			alt: `Poster collage of ${films.length} recent ${films.length === 1 ? 'film' : 'films'}`,
			width: String(asset.width),
			height: String(asset.height),
			loading: 'lazy',
			decoding: 'async',
		},
	});
	const links = wrapper.createDiv({ cls: 'lrf-collage-links' });
	for (const [index, film] of films.entries()) {
		const cell = getCollageCell(asset, index, films.length);
		const information = hoverInformation(film);
		const tooltipParts = [film.title, ...information.details];
		const link = links.createEl('a', {
			cls: 'lrf-collage-link',
			href: film.letterboxdUrl,
			attr: {
				target: '_blank',
				rel: 'noopener noreferrer',
				'aria-label': `${tooltipParts.join(' · ')} — open on Letterboxd`,
			},
		});
		link.style.setProperty('left', percentage(cell.x, asset.width));
		link.style.setProperty('top', percentage(cell.y, asset.height));
		link.style.setProperty('width', percentage(cell.width, asset.width));
		link.style.setProperty('height', percentage(cell.height, asset.height));
	}
	addResizeHandle(wrapper, scroll, config.galleryWidth, onResize);
}

function addResizeHandle(
	wrapper: HTMLElement,
	host: HTMLElement,
	configuredWidth: number,
	onResize: ResizeCallback,
): void {
	let startX = 0;
	let startY = 0;
	let startWidth = 0;
	let startInlineWidth = '';
	let startMaxWidth = '';
	let aspectRatio = 1;
	let currentPercent = configuredWidth;
	let moved = false;
	type Direction = 'horizontal' | 'vertical' | 'both';
	const handles: HTMLElement[] = [];
	const updateWidth = (pixels: number): void => {
		const hostWidth = Math.max(1, host.clientWidth);
		currentPercent = Math.round(Math.max(10, Math.min(100, pixels / hostWidth * 100)));
		wrapper.style.setProperty('width', `${currentPercent}%`);
		for (const handle of handles) handle.setAttr('aria-valuenow', String(currentPercent));
	};
	const createHandle = (direction: Direction, label: string): void => {
		const handle = wrapper.createDiv({
			cls: `lrf-resize-handle lrf-resize-${direction}`,
			attr: {
				role: 'slider',
				tabindex: direction === 'both' ? '0' : '-1',
				'aria-label': `${label}. Double-click to restore automatic sizing.`,
				'aria-valuemin': '10',
				'aria-valuemax': '100',
				'aria-valuenow': String(configuredWidth),
			},
		});
		handles.push(handle);
		handle.addEventListener('focus', () => {
			currentPercent = Math.round(Math.max(
				10,
				Math.min(100, wrapper.getBoundingClientRect().width / Math.max(1, host.clientWidth) * 100),
			));
			handle.setAttr('aria-valuenow', String(currentPercent));
		});
		handle.addEventListener('pointerdown', (event) => {
			event.preventDefault();
			event.stopPropagation();
			const rectangle = wrapper.getBoundingClientRect();
			startX = event.clientX;
			startY = event.clientY;
			startWidth = rectangle.width;
			startInlineWidth = wrapper.style.width;
			startMaxWidth = wrapper.style.maxWidth;
			aspectRatio = rectangle.height > 0 ? rectangle.width / rectangle.height : 1;
			handle.setPointerCapture(event.pointerId);
			currentPercent = Math.round(Math.max(10, Math.min(100, rectangle.width / Math.max(1, host.clientWidth) * 100)));
			for (const item of handles) item.setAttr('aria-valuenow', String(currentPercent));
			moved = false;
			wrapper.addClass('is-resizing');
		});
		handle.addEventListener('pointermove', (event) => {
			if (!handle.hasPointerCapture(event.pointerId)) return;
			const horizontal = event.clientX - startX;
			const vertical = (event.clientY - startY) * aspectRatio;
			const delta = direction === 'horizontal' ? horizontal : direction === 'vertical' ? vertical :
				(Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical);
			if (Math.abs(delta) < 2) return;
			moved = true;
			wrapper.style.removeProperty('max-width');
			updateWidth(startWidth + delta);
		});
		const finishResize = (event: PointerEvent): void => {
			if (!handle.hasPointerCapture(event.pointerId)) return;
			handle.releasePointerCapture(event.pointerId);
			wrapper.removeClass('is-resizing');
			if (moved) void onResize(Math.round(currentPercent / 5) * 5);
		};
		handle.addEventListener('pointerup', finishResize);
		handle.addEventListener('pointercancel', (event) => {
			if (!handle.hasPointerCapture(event.pointerId)) return;
			handle.releasePointerCapture(event.pointerId);
			wrapper.removeClass('is-resizing');
			wrapper.style.setProperty('width', startInlineWidth);
			wrapper.style.setProperty('max-width', startMaxWidth);
		});
		handle.addEventListener('dblclick', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void onResize(null);
		});
		handle.addEventListener('keydown', (event) => {
			if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) return;
			event.preventDefault();
			const change = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -5 : 5;
			currentPercent = Math.max(10, Math.min(100, currentPercent + change));
			wrapper.style.removeProperty('max-width');
			wrapper.style.setProperty('width', `${currentPercent}%`);
			for (const item of handles) item.setAttr('aria-valuenow', String(currentPercent));
			void onResize(currentPercent);
		});
	};
	createHandle('horizontal', 'Drag the right edge to resize the gallery width');
	createHandle('vertical', 'Drag the bottom edge to resize the gallery height proportionally');
	createHandle('both', 'Drag the corner to resize the gallery proportionally');
}

export class GalleryView {
	private run = 0;
	private disposed = false;

	constructor(
		private readonly container: HTMLElement,
		private readonly source: string,
		private readonly getSettings: SettingsProvider,
		private readonly cache: FeedCache,
		private readonly runtime: GalleryRuntime,
		private readonly onResize: ResizeCallback,
		private readonly notifyLayout: () => void = () => undefined,
	) {}

	async refresh(force = false): Promise<void> {
		const currentRun = ++this.run;
		const config = resolveGalleryConfig(this.source, this.getSettings());
		if (!config.username) {
			this.renderError(config, 'Add a Letterboxd username', 'Set a default username in plugin settings or add one to this block.');
			return;
		}
		if (!isValidUsername(config.username)) {
			const message = stateMessage(new FeedError('invalid-username', 'Invalid username.'));
			this.renderError(config, message.title, message.detail);
			return;
		}

		const saved = this.cache.peek(config.username);
		let hasStableImage = false;
		if (saved && saved.films.length > 0) {
			const savedResult: CacheResult = { ...saved, source: 'cache' };
			const films = selectedFilms(saved.films, config.count);
			const columns = this.effectiveColumns(films.length);
			const key = collageCacheKey(films, config, columns, this.container.ownerDocument);
			const asset = this.runtime.collages.peek(key);
			if (asset) {
				this.showCollage(savedResult, config, films, key, asset);
				hasStableImage = true;
			}
		}
		if (!hasStableImage && !this.container.querySelector('.lrf-collage-image')) renderLoading(this.container, config);

		const firstView = config.refreshPolicy === 'open' && this.runtime.markViewed(config.username);
		const maxAge = config.refreshPolicy === 'interval'
			? config.refreshIntervalMinutes * 60_000
			: Number.POSITIVE_INFINITY;
		try {
			const result = await this.cache.get(
				config.username,
				maxAge,
				() => fetchLetterboxdFeed(config.username, config.timeoutSeconds),
				force || firstView,
			);
			if (this.disposed || currentRun !== this.run) return;
			const films = selectedFilms(result.films, config.count);
			const columns = this.effectiveColumns(films.length);
			if (films.length === 0) {
				renderEmpty(this.container, result, config);
			} else {
				const key = collageCacheKey(films, config, columns, this.container.ownerDocument);
				const asset = await this.runtime.collages.get(
					key,
					() => createPosterCollage(films, config, this.container.ownerDocument, columns),
				);
				if (this.disposed || currentRun !== this.run) return;
				this.showCollage(result, config, films, key, asset);
			}
			this.notifyLayout();
		} catch (error) {
			if (this.disposed || currentRun !== this.run || hasStableImage) return;
			const message = stateMessage(error);
			this.renderError(config, message.title, message.detail);
		}
	}

	dispose(): void {
		this.disposed = true;
		this.run += 1;
	}

	private effectiveColumns(filmCount: number): number {
		const maximum = filmCount >= 15 ? 5 : 6;
		return balancedGridColumns(filmCount, Math.min(maximum, Math.max(1, filmCount)));
	}

	private showCollage(
		result: CacheResult,
		config: GalleryConfig,
		films: FilmEntry[],
		key: string,
		asset: CollageAsset,
	): void {
		const url = this.runtime.collages.objectUrl(key, this.container.ownerDocument);
		renderCollage(this.container, result, config, films, asset, url, this.onResize);
	}

	private renderError(config: GalleryConfig, title: string, detail: string): void {
		this.container.empty();
		applyRootClasses(this.container, config);
		addHeading(this.container, config);
		renderState(this.container, title, detail);
		this.notifyLayout();
	}
}
