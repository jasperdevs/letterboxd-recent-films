import { FeedCache, type CacheResult } from './cache';
import { isValidUsername, resolveGalleryConfig } from './block-config';
import {
	collageCacheKey,
	createPosterCollage,
	type CollageAsset,
} from './collage';
import { CollageCache } from './collage-cache';
import { getCollageCell, responsiveGridColumns } from './collage-layout';
import { clampPage, pageCount, pageItems } from './gallery-pagination';
import { FeedError, fetchLetterboxdFeed } from './rss-client';
import type { FilmEntry, GalleryConfig, PluginSettings } from './types';

type SettingsProvider = () => PluginSettings;

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
		if (className === 'lrf-root' || className === 'lrf-render-collage' ||
			className.startsWith('lrf-layout-') || className.startsWith('lrf-poster-') ||
			className.startsWith('lrf-radius-') || className.startsWith('lrf-columns-') ||
			className.startsWith('lrf-gap-') || className.startsWith('lrf-count-') ||
			className === 'lrf-render-gallery') {
			container.removeClass(className);
		}
	}
	container.addClass(
		'lrf-root',
		`lrf-layout-${config.layout}`,
		`lrf-poster-${config.posterSize}`,
		`lrf-radius-${config.cornerRadius}`,
		`lrf-columns-${config.gridColumns}`,
		`lrf-gap-${config.gap}`,
		`lrf-count-${config.count}`,
	);
}

function posterOnlyConfig(config: GalleryConfig): GalleryConfig {
	return {
		...config,
		renderMode: 'collage',
		informationStyle: 'none',
		showCaptions: false,
		showYear: false,
		showRating: false,
		showDate: false,
	};
}

function renderLoading(container: HTMLElement, config: GalleryConfig): void {
	container.empty();
	applyRootClasses(container, config);
	addHeading(container, config);
	const status = container.createDiv({ cls: 'lrf-loading-label', text: 'Loading recent films…' });
	status.setAttr('role', 'status');
	const gallery = container.createDiv({ cls: 'lrf-gallery lrf-loading' });
	for (let index = 0; index < Math.min(config.count, 6); index += 1) gallery.createDiv({ cls: 'lrf-skeleton' });
}

function selectedInformation(
	film: FilmEntry,
	config: GalleryConfig,
	fallbackToTitle: boolean,
): { title: string; details: string[] } {
	const anySelected = config.showCaptions || config.showYear || config.showRating || config.showDate;
	const title = config.showCaptions || (fallbackToTitle && !anySelected) ? film.title : '';
	const details: string[] = [];
	if (config.showYear && film.year) details.push(String(film.year));
	if (config.showRating && film.rating) details.push(formatRating(film.rating));
	if (config.showDate) details.push(formatDate(film.watchedDate));
	return { title, details };
}

function renderFilm(gallery: HTMLElement, film: FilmEntry, config: GalleryConfig): void {
	const figure = gallery.createEl('figure', {
		cls: 'lrf-film',
	});
	const year = film.year ? ` (${film.year})` : '';
	const link = figure.createEl('a', {
		cls: 'lrf-poster-link',
		href: film.letterboxdUrl,
		attr: {
			target: '_blank',
			rel: 'noopener noreferrer',
			'aria-label': `Open ${film.title}${year} on Letterboxd`,
		},
	});
	figure.appendChild(link);
	const frame = link.createDiv({ cls: 'lrf-poster-frame' });
	frame.createDiv({ cls: 'lrf-poster-placeholder', text: film.title.slice(0, 1).toUpperCase() || 'Film' });
	if (film.posterUrl) {
		const image = frame.createEl('img', {
			cls: 'lrf-poster-image',
			attr: {
				src: film.posterUrl,
				alt: `${film.title}${year} poster`,
				loading: 'lazy',
				decoding: 'async',
				referrerpolicy: 'no-referrer',
			},
		});
		image.addEventListener('error', () => image.addClass('is-unavailable'), { once: true });
	}
	const information = selectedInformation(film, config, true);
	if (information.title || information.details.length > 0) {
		const caption = figure.createEl('figcaption', { cls: 'lrf-caption' });
		if (information.title) caption.createDiv({ cls: 'lrf-title', text: information.title });
		if (information.details.length > 0) {
			caption.createDiv({ cls: 'lrf-meta', text: information.details.join(' · ') });
		}
	}
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

function renderGallery(
	container: HTMLElement,
	result: CacheResult,
	config: GalleryConfig,
	films: FilmEntry[],
): void {
	container.empty();
	applyRootClasses(container, config);
	container.addClass('lrf-render-gallery');
	addHeading(container, config);
	addCacheStatus(container, result);
	if (films.length === 0) {
		renderState(container, 'No diary entries yet', 'This public RSS feed does not contain any recent diary entries.');
		return;
	}
	const gallery = container.createDiv({ cls: 'lrf-gallery' });
	if (config.layout === 'grid') {
		gallery.style.setProperty(
			'--lrf-gallery-max-width',
			`${config.gridColumns * config.posterSize + Math.max(0, config.gridColumns - 1) * config.gap}px`,
		);
	}
	for (const film of films) renderFilm(gallery, film, config);
}

function percentage(value: number, total: number): string {
	return `${(value / total) * 100}%`;
}

function enableStripScrolling(scroll: HTMLElement): void {
	scroll.addEventListener('wheel', (event) => {
		if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || scroll.scrollWidth <= scroll.clientWidth) return;
		const atStart = scroll.scrollLeft <= 0 && event.deltaY < 0;
		const atEnd = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 1 && event.deltaY > 0;
		if (atStart || atEnd) return;
		event.preventDefault();
		scroll.scrollLeft += event.deltaY;
	}, { passive: false });
	let startX = 0;
	let startScroll = 0;
	let dragging = false;
	scroll.addEventListener('pointerdown', (event) => {
		if (event.button !== 0 || scroll.scrollWidth <= scroll.clientWidth) return;
		startX = event.clientX;
		startScroll = scroll.scrollLeft;
		dragging = false;
		scroll.setPointerCapture(event.pointerId);
	});
	scroll.addEventListener('pointermove', (event) => {
		if (!scroll.hasPointerCapture(event.pointerId)) return;
		const distance = event.clientX - startX;
		if (Math.abs(distance) > 4) dragging = true;
		if (dragging) scroll.scrollLeft = startScroll - distance;
	});
	scroll.addEventListener('click', (event) => {
		if (dragging) {
			event.preventDefault();
			event.stopPropagation();
			dragging = false;
		}
	}, true);
}

function renderCollage(
	container: HTMLElement,
	result: CacheResult,
	config: GalleryConfig,
	films: FilmEntry[],
	asset: CollageAsset,
	url: string,
): void {
	container.empty();
	applyRootClasses(container, config);
	container.addClass('lrf-render-collage');
	addHeading(container, config);
	addCacheStatus(container, result);
	const scroll = container.createDiv({ cls: 'lrf-collage-scroll' });
	const wrapper = scroll.createDiv({ cls: 'lrf-collage-wrap' });
	wrapper.createEl('img', {
		cls: 'lrf-collage-image',
		attr: {
			src: url,
			alt: `Poster collage: ${films.map((film) => film.title).join(', ')}`,
			width: String(asset.width),
			height: String(asset.height),
			loading: 'lazy',
			decoding: 'async',
		},
	});
	const links = wrapper.createDiv({ cls: 'lrf-collage-links' });
	for (const [index, film] of films.entries()) {
		const cell = getCollageCell(asset, index, films.length);
		const information = selectedInformation(film, config, false);
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
	if (config.layout === 'strip') enableStripScrolling(scroll);
}

export class GalleryView {
	private run = 0;
	private disposed = false;
	private page = 0;
	private lastResult: CacheResult | null = null;
	private lastColumns = 0;
	private lastCompositionWidth = 0;
	private resizeTimer: number | null = null;
	private readonly resizeObserver: ResizeObserver | null;

	constructor(
		private readonly container: HTMLElement,
		private readonly source: string,
		private readonly getSettings: SettingsProvider,
		private readonly cache: FeedCache,
		private readonly runtime: GalleryRuntime,
		private readonly notifyLayout: () => void = () => undefined,
	) {
		const ResizeObserverConstructor = container.ownerDocument.defaultView?.ResizeObserver;
		this.resizeObserver = ResizeObserverConstructor ? new ResizeObserverConstructor(() => this.handleResize()) : null;
		this.resizeObserver?.observe(container);
	}

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

		const columns = this.effectiveColumns(config);
		this.lastColumns = columns;
		const saved = this.cache.peek(config.username);
		let hasStableImage = false;
		if (saved && config.renderMode === 'collage' && saved.films.length > 0) {
			const savedResult: CacheResult = { ...saved, source: 'cache' };
			this.lastResult = savedResult;
			this.page = clampPage(this.page, saved.films.length, config.count);
			const films = pageItems(saved.films, this.page, config.count);
			const compositionWidth = this.compositionWidth(config);
			this.lastCompositionWidth = compositionWidth ?? 0;
			const collageConfig = posterOnlyConfig(config);
			const key = collageCacheKey(films, collageConfig, columns, this.container.ownerDocument, compositionWidth);
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
			this.lastResult = result;
			this.page = clampPage(this.page, result.films.length, config.count);
			const films = pageItems(result.films, this.page, config.count);
			if (config.renderMode === 'gallery' || films.length === 0) {
				renderGallery(this.container, result, config, films);
				this.addPaginationControls(config, result.films.length);
			} else {
				const compositionWidth = this.compositionWidth(config);
				this.lastCompositionWidth = compositionWidth ?? 0;
				const collageConfig = posterOnlyConfig(config);
				const key = collageCacheKey(films, collageConfig, columns, this.container.ownerDocument, compositionWidth);
				const asset = await this.runtime.collages.get(
					key,
					() => createPosterCollage(films, collageConfig, this.container.ownerDocument, columns, compositionWidth),
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
		this.resizeObserver?.disconnect();
		if (this.resizeTimer !== null) this.container.ownerDocument.defaultView?.clearTimeout(this.resizeTimer);
	}

	private effectiveColumns(config: GalleryConfig): number {
		if (config.layout === 'strip') return config.count;
		const width = this.availableWidth();
		return responsiveGridColumns(width, config.gridColumns, config.posterSize, config.gap);
	}

	private availableWidth(): number {
		return this.container.clientWidth || this.container.parentElement?.clientWidth || 700;
	}

	private compositionWidth(config: GalleryConfig): number | undefined {
		if (config.layout === 'strip') return undefined;
		return Math.max(280, Math.floor(this.availableWidth() / 40) * 40);
	}

	private handleResize(): void {
		if (this.disposed) return;
		const config = resolveGalleryConfig(this.source, this.getSettings());
		const columns = this.effectiveColumns(config);
		const compositionWidth = this.compositionWidth(config) ?? 0;
		if (columns === this.lastColumns && compositionWidth === this.lastCompositionWidth) return;
		const window = this.container.ownerDocument.defaultView;
		if (this.resizeTimer !== null) window?.clearTimeout(this.resizeTimer);
		this.resizeTimer = window?.setTimeout(() => {
			this.resizeTimer = null;
			void this.refresh(false);
		}, 120) ?? null;
	}

	private showCollage(
		result: CacheResult,
		config: GalleryConfig,
		films: FilmEntry[],
		key: string,
		asset: CollageAsset,
	): void {
		const url = this.runtime.collages.objectUrl(key, this.container.ownerDocument);
		renderCollage(this.container, result, config, films, asset, url);
		this.addPaginationControls(config, result.films.length);
	}

	private addPaginationControls(config: GalleryConfig, totalFilms: number): void {
		const lastPage = pageCount(totalFilms, config.count) - 1;
		if (lastPage === 0) return;
		const navigation = this.container.createDiv({ cls: 'lrf-page-navigation' });
		this.addPaginationButton(navigation, 'previous', config.count, this.page === 0);
		navigation.createDiv({
			cls: 'lrf-page-status',
			text: `${this.page + 1} / ${lastPage + 1}`,
			attr: { 'aria-live': 'polite' },
		});
		this.addPaginationButton(navigation, 'next', config.count, this.page === lastPage);
	}

	private addPaginationButton(
		parent: HTMLElement,
		direction: 'previous' | 'next',
		pageSize: number,
		disabled: boolean,
	): void {
		const button = parent.createEl('button', {
			cls: `lrf-page-button lrf-page-${direction}`,
			text: direction === 'previous' ? '‹' : '›',
			attr: {
				type: 'button',
				'aria-label': `${direction === 'previous' ? 'Previous' : 'Next'} ${pageSize} films`,
			},
		});
		button.disabled = disabled;
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void this.changePage(direction === 'previous' ? -1 : 1);
		});
	}

	private async changePage(delta: number): Promise<void> {
		const result = this.lastResult;
		if (!result) return;
		const config = resolveGalleryConfig(this.source, this.getSettings());
		const lastPage = pageCount(result.films.length, config.count) - 1;
		const nextPage = Math.max(0, Math.min(lastPage, this.page + delta));
		if (nextPage === this.page) return;
		this.page = nextPage;
		const currentRun = ++this.run;
		const films = pageItems(result.films, this.page, config.count);
		if (config.renderMode === 'gallery' || films.length === 0) {
			renderGallery(this.container, result, config, films);
			this.addPaginationControls(config, result.films.length);
			this.notifyLayout();
			return;
		}
		const columns = this.effectiveColumns(config);
		this.lastColumns = columns;
		const compositionWidth = this.compositionWidth(config);
		this.lastCompositionWidth = compositionWidth ?? 0;
		const collageConfig = posterOnlyConfig(config);
		const key = collageCacheKey(films, collageConfig, columns, this.container.ownerDocument, compositionWidth);
		const asset = await this.runtime.collages.get(
			key,
			() => createPosterCollage(films, collageConfig, this.container.ownerDocument, columns, compositionWidth),
		);
		if (this.disposed || currentRun !== this.run) return;
		this.showCollage(result, config, films, key, asset);
		this.notifyLayout();
	}

	private renderError(config: GalleryConfig, title: string, detail: string): void {
		this.container.empty();
		applyRootClasses(this.container, config);
		addHeading(this.container, config);
		renderState(this.container, title, detail);
		this.notifyLayout();
	}
}
