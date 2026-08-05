import { Notice, PluginSettingTab, Setting } from 'obsidian';
import { isValidUsername } from './block-config';
import {
	CORNER_RADII,
	GAPS,
	POSTER_SIZES,
	REFRESH_INTERVALS,
	TIMEOUT_SECONDS,
} from './types';
import type LetterboxdRecentFilmsPlugin from './main';

function minuteLabel(minutes: number): string {
	if (minutes < 60) return `${minutes} minutes`;
	if (minutes === 60) return '1 hour';
	if (minutes < 1440) return `${minutes / 60} hours`;
	return '24 hours';
}

function posterSizeLabel(size: number): string {
	const labels: Record<number, string> = {
		80: 'Tiny',
		100: 'Compact',
		120: 'Comfortable (recommended)',
		140: 'Medium',
		160: 'Large',
		180: 'Extra large',
		200: 'Very large',
		220: 'Maximum',
	};
	return `${labels[size] ?? `${size} px`} · ${size} px`;
}

export class LetterboxdRecentFilmsSettingTab extends PluginSettingTab {
	private showAdvanced = false;

	constructor(private readonly plugin: LetterboxdRecentFilmsPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		this.renderSettings();
	}

	private renderSettings(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Account').setHeading();

		new Setting(containerEl)
			.setName('Letterboxd username')
			.setDesc('Public account used by blocks that do not specify a username.')
			.addText((text) => text
				.setPlaceholder('Username')
				.setValue(this.plugin.settings.username)
				.onChange(async (value) => {
					this.plugin.settings.username = value.trim();
					await this.plugin.saveSettings();
				}))
			.addButton((button) => button
				.setButtonText('Test')
				.onClick(async () => {
					if (!isValidUsername(this.plugin.settings.username)) {
						new Notice('Enter a valid username first.');
						return;
					}
					button.setDisabled(true).setButtonText('Testing…');
					try {
						await this.plugin.testFeed();
					} finally {
						button.setDisabled(false).setButtonText('Test');
					}
				}));

		new Setting(containerEl).setName('Gallery').setHeading();

		new Setting(containerEl)
			.setName('Movies shown')
			.setDesc('How many recent movies appear at once. Hover the gallery arrows to continue through the feed.')
			.addDropdown((dropdown) => {
				for (let count = 1; count <= 20; count += 1) {
					dropdown.addOption(String(count), `${count} ${count === 1 ? 'movie' : 'movies'}`);
				}
				dropdown.setValue(String(this.plugin.settings.count));
				dropdown.onChange(async (value) => {
					this.plugin.settings.count = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Layout')
			.setDesc('Grid shows every movie on the page. Scrolling row keeps one horizontal line.')
			.addDropdown((dropdown) => dropdown
				.addOption('grid', 'Grid (recommended)')
				.addOption('strip', 'Scrolling row')
				.setValue(this.plugin.settings.layout)
				.onChange(async (value) => {
					this.plugin.settings.layout = value === 'grid' ? 'grid' : 'strip';
					await this.plugin.saveSettings();
					this.renderSettings();
				}));

		new Setting(containerEl)
			.setName('Display style')
			.setDesc('Poster collage is the clean default. Detailed posters add text underneath.')
			.addDropdown((dropdown) => dropdown
				.addOption('collage', 'Poster collage (recommended)')
				.addOption('gallery', 'Detailed posters')
				.setValue(this.plugin.settings.renderMode)
				.onChange(async (value) => {
					this.plugin.settings.renderMode = value === 'gallery' ? 'gallery' : 'collage';
					this.plugin.settings.informationStyle = value === 'gallery' ? 'cards' : 'none';
					await this.plugin.saveSettings();
					this.renderSettings();
				}));

		new Setting(containerEl).setName('Appearance').setHeading();

		new Setting(containerEl)
			.setName('Poster size')
			.setDesc('Choose a consistent poster width. Comfortable fits most notes without crowding.')
			.addDropdown((dropdown) => {
				for (const size of POSTER_SIZES) dropdown.addOption(String(size), posterSizeLabel(size));
				dropdown.setValue(String(this.plugin.settings.posterSize));
				dropdown.onChange(async (value) => {
					this.plugin.settings.posterSize = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Advanced settings')
			.setDesc('Heading, spacing, corner radius, film information, refresh behavior, and cache tools.')
			.addButton((button) => button
				.setButtonText(this.showAdvanced ? 'Hide advanced' : 'Show advanced')
				.onClick(() => {
					this.showAdvanced = !this.showAdvanced;
					this.renderSettings();
				}));

		if (!this.showAdvanced) return;

		new Setting(containerEl)
			.setName('Corner radius')
			.setDesc('Rounds card posters, or only the outside edge of a complete collage.')
			.addDropdown((dropdown) => {
				for (const radius of CORNER_RADII) dropdown.addOption(String(radius), `${radius} px`);
				dropdown.setValue(String(this.plugin.settings.cornerRadius));
				dropdown.onChange(async (value) => {
					this.plugin.settings.cornerRadius = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Poster gap')
			.setDesc('Space between posters or cards.')
			.addDropdown((dropdown) => {
				for (const gap of GAPS) dropdown.addOption(String(gap), `${gap} px`);
				dropdown.setValue(String(this.plugin.settings.gap));
				dropdown.onChange(async (value) => {
					this.plugin.settings.gap = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show heading')
			.setDesc('Display a heading above each gallery.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showHeading)
				.onChange(async (value) => {
					this.plugin.settings.showHeading = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Heading text')
			.setDesc('Heading used when the heading toggle is enabled.')
			.addText((text) => text
				.setValue(this.plugin.settings.heading)
				.onChange(async (value) => {
					this.plugin.settings.heading = value.slice(0, 120);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Film information')
			.setDesc(this.plugin.settings.renderMode === 'gallery'
				? 'Choose the information shown under detailed cards.'
				: 'Choose the information revealed when a poster is hovered or focused.')
			.setHeading();
		this.addToggle('Show titles', 'Show film titles.', 'showCaptions');
		this.addToggle('Show year', 'Show each film’s release year.', 'showYear');
		this.addToggle('Show rating', 'Show the diary entry rating.', 'showRating');
		this.addToggle('Show watched date', 'Show the diary watched date.', 'showDate');

		new Setting(containerEl).setName('Updates and cache').setHeading();

		new Setting(containerEl)
			.setName('Refresh policy')
			.setDesc('Choose when the public feed is requested. There is no background polling.')
			.addDropdown((dropdown) => dropdown
				.addOption('open', 'When a gallery is viewed')
				.addOption('interval', 'After the cache interval')
				.addOption('manual', 'Manual only')
				.setValue(this.plugin.settings.refreshPolicy)
				.onChange(async (value) => {
					if (value === 'interval' || value === 'manual') this.plugin.settings.refreshPolicy = value;
					else this.plugin.settings.refreshPolicy = 'open';
					await this.plugin.saveSettings();
					this.renderSettings();
				}));

		if (this.plugin.settings.refreshPolicy === 'interval') new Setting(containerEl)
			.setName('Refresh interval')
			.setDesc('How long a response remains fresh when the interval policy is selected.')
			.addDropdown((dropdown) => {
				for (const minutes of REFRESH_INTERVALS) {
					dropdown.addOption(String(minutes), minuteLabel(minutes));
				}
				dropdown.setValue(String(this.plugin.settings.refreshIntervalMinutes));
				dropdown.onChange(async (value) => {
					this.plugin.settings.refreshIntervalMinutes = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Request timeout')
			.setDesc('How long to wait for a response before using a saved result.')
			.addDropdown((dropdown) => {
				for (const seconds of TIMEOUT_SECONDS) dropdown.addOption(String(seconds), `${seconds} seconds`);
				dropdown.setValue(String(this.plugin.settings.timeoutSeconds));
				dropdown.onChange(async (value) => {
					this.plugin.settings.timeoutSeconds = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Clear cache')
			.setDesc('Remove all saved feed results. Posters are never stored in the vault.')
			.addButton((button) => button
				.setButtonText('Clear cache')
				.onClick(async () => this.plugin.clearCache()));
	}

	private addToggle(
		name: string,
		description: string,
		property: 'showCaptions' | 'showYear' | 'showRating' | 'showDate',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(description)
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings[property])
				.onChange(async (value) => {
					this.plugin.settings[property] = value;
					await this.plugin.saveSettings();
				}));
	}
}
