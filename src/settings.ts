import { Notice, PluginSettingTab, Setting } from 'obsidian';
import { isValidUsername } from './block-config';
import {
	CORNER_RADII,
	GAPS,
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
			.setDesc('Choose 1–20 recent entries, or max for everything returned by the RSS feed.')
			.addSlider((slider) => slider
				.setLimits(1, 21, 1)
				.setValue(this.plugin.settings.count === 0 ? 21 : this.plugin.settings.count)
				.setInstant(false)
				.setDisplayFormat((value) => value === 21 ? 'Max' : String(value))
				.onChange(async (value) => {
					this.plugin.settings.count = value === 21 ? 0 : value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setName('Appearance').setHeading();

		new Setting(containerEl)
			.setName('Automatic size')
			.setDesc('Keep one or two posters compact and larger sets readable without shrinking them into thumbnails.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.autoSize)
				.onChange(async (value) => {
					this.plugin.settings.autoSize = value;
					await this.plugin.saveSettings();
					this.renderSettings();
				}));

		new Setting(containerEl)
			.setName('Manual width')
			.setDesc(this.plugin.settings.autoSize
				? 'Drag the collage edge to switch to manual sizing, or turn off Automatic size.'
				: 'Maximum width of the complete collage. You can also drag its bottom-right corner.')
			.addSlider((slider) => slider
				.setLimits(10, 100, 5)
				.setValue(this.plugin.settings.galleryWidth)
				.setDisabled(this.plugin.settings.autoSize)
				.setInstant(false)
				.setDisplayFormat((value) => `${value}%`)
				.onChange(async (value) => {
					this.plugin.settings.galleryWidth = value;
					this.plugin.settings.autoSize = false;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show heading')
			.setDesc('Display a heading above the collage.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showHeading)
				.onChange(async (value) => {
					this.plugin.settings.showHeading = value;
					await this.plugin.saveSettings();
					this.renderSettings();
				}));

		if (this.plugin.settings.showHeading) new Setting(containerEl)
			.setName('Heading text')
			.setDesc('Text displayed above the collage.')
			.addText((text) => text
				.setValue(this.plugin.settings.heading)
				.onChange(async (value) => {
					this.plugin.settings.heading = value.slice(0, 120);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Advanced settings')
			.setDesc('Spacing, corner radius, optional captions, refresh behavior, and cache tools.')
			.addButton((button) => button
				.setButtonText(this.showAdvanced ? 'Hide advanced' : 'Show advanced')
				.onClick(() => {
					this.showAdvanced = !this.showAdvanced;
					this.renderSettings();
				}));

		if (!this.showAdvanced) return;

		new Setting(containerEl)
			.setName('Corner radius')
			.setDesc('Round only the outside edge of the complete collage.')
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
			.setDesc('Space between posters in the collage.')
			.addDropdown((dropdown) => {
				for (const gap of GAPS) dropdown.addOption(String(gap), `${gap} px`);
				dropdown.setValue(String(this.plugin.settings.gap));
				dropdown.onChange(async (value) => {
					this.plugin.settings.gap = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Captions under posters')
			.setDesc('Hover always shows the complete film information. These options add selected details under each poster.')
			.setHeading();
		this.addToggle('Title', 'Add the film title below each poster.', 'showCaptions');
		this.addToggle('Year', 'Add the release year.', 'showYear');
		this.addToggle('Rating', 'Add the diary entry rating.', 'showRating');
		this.addToggle('Watched date', 'Add the watched date.', 'showDate');

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
