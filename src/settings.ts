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

export class LetterboxdRecentFilmsSettingTab extends PluginSettingTab {
	constructor(private readonly plugin: LetterboxdRecentFilmsPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		this.renderSettings();
	}

	private renderSettings(): void {
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
			.setName('Films per page')
			.setDesc('Number shown at once (1–20). Navigation continues through older RSS entries.')
			.addSlider((slider) => slider
				.setLimits(1, 20, 1)
				.setValue(this.plugin.settings.count)
				.onChange(async (value) => {
					this.plugin.settings.count = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Layout')
			.setDesc('Use a horizontally scrolling row or a wrapping grid.')
			.addDropdown((dropdown) => dropdown
				.addOption('strip', 'Row')
				.addOption('grid', 'Grid')
				.setValue(this.plugin.settings.layout)
				.onChange(async (value) => {
					this.plugin.settings.layout = value === 'grid' ? 'grid' : 'strip';
					await this.plugin.saveSettings();
					this.renderSettings();
				}));

		new Setting(containerEl)
			.setName('Display style')
			.setDesc('Use one poster-only collage image or separate cards with readable film information.')
			.addDropdown((dropdown) => dropdown
				.addOption('collage', 'Poster collage')
				.addOption('gallery', 'Detailed cards')
				.setValue(this.plugin.settings.renderMode)
				.onChange(async (value) => {
					this.plugin.settings.renderMode = value === 'gallery' ? 'gallery' : 'collage';
					this.plugin.settings.informationStyle = value === 'gallery' ? 'cards' : 'none';
					await this.plugin.saveSettings();
					this.renderSettings();
				}));

		if (this.plugin.settings.layout === 'grid') new Setting(containerEl)
			.setName('Grid columns')
			.setDesc('Maximum number of posters or cards in each row. Narrow notes use fewer automatically.')
			.addSlider((slider) => slider
				.setLimits(2, 6, 1)
				.setValue(this.plugin.settings.gridColumns)
				.onChange(async (value) => {
					this.plugin.settings.gridColumns = value;
					await this.plugin.saveSettings();
				}));

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

		new Setting(containerEl)
			.setName('Poster size')
			.setDesc('Preferred poster width. Grid posters can grow to fill space but never exceed 220 px.')
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
				}));

		new Setting(containerEl)
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
