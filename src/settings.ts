import { Notice, PluginSettingTab, Setting } from 'obsidian';
import { isValidUsername } from './block-config';
import {
	CORNER_RADII,
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

export class LetterboxdRecentFilmsSettingTab extends PluginSettingTab {
	constructor(private readonly plugin: LetterboxdRecentFilmsPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Letterboxd username')
			.setDesc('Public account used by blocks that do not specify a username.')
			.addText((text) => text
				.setPlaceholder('Username')
				.setValue(this.plugin.settings.username)
				.onChange(async (value) => {
					this.plugin.settings.username = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Film count')
			.setDesc('Number of diary entries to show (1–20).')
			.addSlider((slider) => slider
				.setLimits(1, 20, 1)
				.setValue(this.plugin.settings.count)
				.onChange(async (value) => {
					this.plugin.settings.count = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Layout')
			.setDesc('Show one scrolling strip or a wrapping grid.')
			.addDropdown((dropdown) => dropdown
				.addOption('strip', 'Strip')
				.addOption('grid', 'Grid')
				.setValue(this.plugin.settings.layout)
				.onChange(async (value) => {
					this.plugin.settings.layout = value === 'grid' ? 'grid' : 'strip';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Grid columns')
			.setDesc('Maximum desktop columns for the grid layout. Phones use two columns.')
			.addSlider((slider) => slider
				.setLimits(2, 8, 1)
				.setValue(this.plugin.settings.gridColumns)
				.onChange(async (value) => {
					this.plugin.settings.gridColumns = value;
					await this.plugin.saveSettings();
				}));

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

		this.addToggle('Show captions', 'Show each film title below its poster.', 'showCaptions');
		this.addToggle('Show year', 'Show the release year below each poster.', 'showYear');
		this.addToggle('Show rating', 'Show the diary entry rating below each poster.', 'showRating');
		this.addToggle('Show watched date', 'Show the watched date below each poster.', 'showDate');

		new Setting(containerEl)
			.setName('Poster size')
			.setDesc('Poster width in pixels. Grid posters may shrink on narrow screens.')
			.addDropdown((dropdown) => {
				for (const size of POSTER_SIZES) dropdown.addOption(String(size), `${size} px`);
				dropdown.setValue(String(this.plugin.settings.posterSize));
				dropdown.onChange(async (value) => {
					this.plugin.settings.posterSize = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Corner radius')
			.setDesc('Rounded poster corner size.')
			.addDropdown((dropdown) => {
				for (const radius of CORNER_RADII) dropdown.addOption(String(radius), `${radius} px`);
				dropdown.setValue(String(this.plugin.settings.cornerRadius));
				dropdown.onChange(async (value) => {
					this.plugin.settings.cornerRadius = Number.parseInt(value, 10);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Refresh interval')
			.setDesc('How long a successful feed response remains fresh.')
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
			.setName('Test feed')
			.setDesc('Request the current default user’s public RSS feed now.')
			.addButton((button) => button
				.setButtonText('Test feed')
				.onClick(async () => {
					if (!isValidUsername(this.plugin.settings.username)) {
						new Notice('Enter a valid username first.');
						return;
					}
					button.setDisabled(true).setButtonText('Testing…');
					try {
						await this.plugin.testFeed();
					} finally {
						button.setDisabled(false).setButtonText('Test feed');
					}
				}));

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
