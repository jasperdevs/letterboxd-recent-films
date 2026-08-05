import { FeedCache, type CacheResult } from './cache';
import { isValidUsername, resolveGalleryConfig } from './block-config';
import { FeedError, fetchLetterboxdFeed } from './rss-client';
import type { FilmEntry, GalleryConfig, PluginSettings } from './types';

type SettingsProvider = () => PluginSettings;

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

function renderLoading(container: HTMLElement, config: GalleryConfig): void {
	container.empty();
	applyRootClasses(container, config);
	addHeading(container, config);
	const status = container.createDiv({ cls: 'lrf-loading-label', text: 'Loading recent films…' });
	status.setAttr('role', 'status');
	const gallery = container.createDiv({ cls: 'lrf-gallery lrf-loading' });
	for (let index = 0; index < Math.min(config.count, 8); index += 1) {
		gallery.createDiv({ cls: 'lrf-skeleton' });
	}
}

function renderFilm(gallery: HTMLElement, film: FilmEntry, config: GalleryConfig): void {
	const figure = gallery.createEl('figure', { cls: 'lrf-film' });
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

	if (config.showCaptions || config.showYear || config.showRating || config.showDate) {
		const caption = figure.createEl('figcaption', { cls: 'lrf-caption' });
		if (config.showCaptions) caption.createDiv({ cls: 'lrf-title', text: film.title });
		const details: string[] = [];
		if (config.showYear && film.year) details.push(String(film.year));
		if (config.showRating && film.rating) details.push(formatRating(film.rating));
		if (config.showDate) details.push(formatDate(film.watchedDate));
		if (details.length > 0) caption.createDiv({ cls: 'lrf-meta', text: details.join(' · ') });
	}
}

function applyRootClasses(container: HTMLElement, config: GalleryConfig): void {
	container.addClass(
		'lrf-root',
		`lrf-layout-${config.layout}`,
		`lrf-poster-${config.posterSize}`,
		`lrf-radius-${config.cornerRadius}`,
		`lrf-columns-${config.gridColumns}`,
	);
}

function renderFilms(container: HTMLElement, result: CacheResult, config: GalleryConfig): void {
	container.empty();
	applyRootClasses(container, config);
	addHeading(container, config);

	if (result.source === 'stale') {
		const message = stateMessage(result.error);
		const status = container.createDiv({
			cls: 'lrf-cache-status',
			text: `${message.title}. Showing the last saved gallery.`,
		});
		status.setAttr('role', 'status');
	}

	const films = result.films.slice(0, config.count);
	if (films.length === 0) {
		renderState(container, 'No diary entries yet', 'This public RSS feed does not contain any recent diary entries.');
		return;
	}

	const gallery = container.createDiv({ cls: 'lrf-gallery' });
	for (const film of films) renderFilm(gallery, film, config);
}

export class GalleryView {
	private run = 0;
	private disposed = false;

	constructor(
		private readonly container: HTMLElement,
		private readonly source: string,
		private readonly getSettings: SettingsProvider,
		private readonly cache: FeedCache,
	) {}

	async refresh(force = false): Promise<void> {
		const currentRun = ++this.run;
		const config = resolveGalleryConfig(this.source, this.getSettings());
		renderLoading(this.container, config);

		if (!config.username) {
			this.container.empty();
			applyRootClasses(this.container, config);
			addHeading(this.container, config);
			renderState(this.container, 'Add a Letterboxd username', 'Set a default username in plugin settings or add one to this block.');
			return;
		}
		if (!isValidUsername(config.username)) {
			this.container.empty();
			applyRootClasses(this.container, config);
			addHeading(this.container, config);
			const message = stateMessage(new FeedError('invalid-username', 'Invalid username.'));
			renderState(this.container, message.title, message.detail);
			return;
		}

		try {
			const result = await this.cache.get(
				config.username,
				config.refreshIntervalMinutes * 60_000,
				() => fetchLetterboxdFeed(config.username, config.timeoutSeconds),
				force,
			);
			if (this.disposed || currentRun !== this.run) return;
			renderFilms(this.container, result, config);
		} catch (error) {
			if (this.disposed || currentRun !== this.run) return;
			this.container.empty();
			applyRootClasses(this.container, config);
			addHeading(this.container, config);
			const message = stateMessage(error);
			renderState(this.container, message.title, message.detail);
		}
	}

	dispose(): void {
		this.disposed = true;
		this.run += 1;
	}
}
