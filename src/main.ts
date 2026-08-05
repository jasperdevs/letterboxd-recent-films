import {
	MarkdownRenderChild,
	MarkdownView,
	Notice,
	Plugin,
	type MarkdownPostProcessorContext,
} from 'obsidian';
import { FeedCache, normalizeCache } from './cache';
import { normalizeSettings } from './block-config';
import { createGalleryBlock, planGalleryInsertionAtTop } from './note-insertion';
import { GalleryView } from './renderer';
import { fetchLetterboxdFeed } from './rss-client';
import { LetterboxdRecentFilmsSettingTab } from './settings';
import type { PluginData, PluginSettings } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class GalleryRenderChild extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private readonly view: GalleryView,
		private readonly remove: () => void,
	) {
		super(containerEl);
	}

	onload(): void {
		void this.view.refresh();
	}

	onunload(): void {
		this.view.dispose();
		this.remove();
	}
}

export default class LetterboxdRecentFilmsPlugin extends Plugin {
	settings: PluginSettings = normalizeSettings(null);
	private cache!: FeedCache;
	private readonly galleries = new Set<GalleryView>();
	private saveChain: Promise<void> = Promise.resolve();

	async onload(): Promise<void> {
		const loaded: unknown = await this.loadData();
		const loadedRecord = isRecord(loaded) ? loaded : {};
		this.settings = normalizeSettings(loadedRecord.settings ?? loadedRecord);
		const initialCache = normalizeCache(loadedRecord.cache);
		this.cache = new FeedCache(initialCache, async () => this.persistData());

		this.registerMarkdownCodeBlockProcessor(
			'letterboxd-recent',
			(source, element, context) => this.registerGallery(source, element, context),
		);

		this.addCommand({
			id: 'insert-gallery-at-cursor',
			name: 'Insert gallery at cursor',
			editorCallback: (editor) => editor.replaceSelection(createGalleryBlock()),
		});

		this.addCommand({
			id: 'insert-gallery-at-top',
			name: 'Insert gallery at top of current note',
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (checking) return true;
				const source = view.editor.getValue();
				const plan = planGalleryInsertionAtTop(source);
				if (plan.duplicate) {
					new Notice('A recent films block already exists in this note.');
					return true;
				}
				view.editor.replaceRange(plan.text, view.editor.offsetToPos(plan.offset));
				return true;
			},
		});

		this.addCommand({
			id: 'refresh-galleries',
			name: 'Refresh galleries',
			callback: () => {
				void this.refreshGalleries(true).then(() => new Notice('Letterboxd galleries refreshed.'));
			},
		});

		this.addCommand({
			id: 'clear-cache',
			name: 'Clear cache',
			callback: () => {
				void this.clearCache();
			},
		});

		this.addSettingTab(new LetterboxdRecentFilmsSettingTab(this));
	}

	onunload(): void {
		for (const gallery of this.galleries) gallery.dispose();
		this.galleries.clear();
	}

	async saveSettings(): Promise<void> {
		this.settings = normalizeSettings(this.settings);
		await this.persistData();
		await this.refreshGalleries(false);
	}

	async testFeed(): Promise<void> {
		try {
			const result = await this.cache.get(
				this.settings.username,
				this.settings.refreshIntervalMinutes * 60_000,
				() => fetchLetterboxdFeed(this.settings.username, this.settings.timeoutSeconds),
				true,
			);
			if (result.source === 'stale') {
				new Notice('Feed test failed. A saved gallery is still available.');
			} else {
				new Notice(`Feed test succeeded: ${result.films.length} diary entries found.`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown feed error.';
			new Notice(`Feed test failed: ${message}`);
		}
	}

	async clearCache(): Promise<void> {
		await this.cache.clear();
		new Notice('Letterboxd feed cache cleared.');
	}

	private registerGallery(
		source: string,
		element: HTMLElement,
		context: MarkdownPostProcessorContext,
	): void {
		const gallery = new GalleryView(element, source, () => this.settings, this.cache);
		this.galleries.add(gallery);
		context.addChild(new GalleryRenderChild(element, gallery, () => this.galleries.delete(gallery)));
	}

	private async refreshGalleries(force: boolean): Promise<void> {
		await Promise.allSettled(Array.from(this.galleries, (gallery) => gallery.refresh(force)));
	}

	private persistData(): Promise<void> {
		const data: PluginData = {
			settings: { ...this.settings },
			cache: { ...this.cache.getEntries() },
		};
		const operation = this.saveChain
			.catch(() => undefined)
			.then(async () => this.saveData(data));
		this.saveChain = operation;
		return operation;
	}
}
