import {
	CORNER_RADII,
	DEFAULT_SETTINGS,
	GAPS,
	POSTER_SIZES,
	REFRESH_INTERVALS,
	TIMEOUT_SECONDS,
	type GalleryConfig,
	type GalleryLayout,
	type PluginSettings,
	type RefreshPolicy,
	type RenderMode,
} from './types';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{2,15}$/;

type BlockOverrides = Partial<GalleryConfig>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteInteger(value: unknown, fallback: number, min: number, max: number): number {
	return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
		? value
		: fallback;
}

function allowedNumber(
	value: unknown,
	fallback: number,
	allowed: readonly number[],
): number {
	return typeof value === 'number' && allowed.includes(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function stringValue(value: unknown, fallback: string, maxLength: number): string {
	return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

function layoutValue(value: unknown, fallback: GalleryLayout): GalleryLayout {
	return value === 'strip' || value === 'grid' ? value : fallback;
}

function renderModeValue(value: unknown, fallback: RenderMode): RenderMode {
	return value === 'collage' || value === 'gallery' ? value : fallback;
}

function refreshPolicyValue(value: unknown, fallback: RefreshPolicy): RefreshPolicy {
	return value === 'open' || value === 'interval' || value === 'manual' ? value : fallback;
}

export function normalizeSettings(value: unknown): PluginSettings {
	const input = isRecord(value) ? value : {};
	const renderMode = renderModeValue(input.renderMode, DEFAULT_SETTINGS.renderMode);
	return {
		username: stringValue(input.username, DEFAULT_SETTINGS.username, 15).trim(),
		count: finiteInteger(input.count, DEFAULT_SETTINGS.count, 1, 20),
		layout: layoutValue(input.layout, DEFAULT_SETTINGS.layout),
		renderMode,
		informationStyle: renderMode === 'gallery' ? 'cards' : 'none',
		gridColumns: finiteInteger(input.gridColumns, DEFAULT_SETTINGS.gridColumns, 2, 6),
		gap: allowedNumber(input.gap, DEFAULT_SETTINGS.gap, GAPS),
		heading: stringValue(input.heading, DEFAULT_SETTINGS.heading, 120),
		showHeading: booleanValue(input.showHeading, DEFAULT_SETTINGS.showHeading),
		showCaptions: booleanValue(input.showCaptions, DEFAULT_SETTINGS.showCaptions),
		showYear: booleanValue(input.showYear, DEFAULT_SETTINGS.showYear),
		showRating: booleanValue(input.showRating, DEFAULT_SETTINGS.showRating),
		showDate: booleanValue(input.showDate, DEFAULT_SETTINGS.showDate),
		posterSize: allowedNumber(input.posterSize, DEFAULT_SETTINGS.posterSize, POSTER_SIZES),
		cornerRadius: allowedNumber(input.cornerRadius, DEFAULT_SETTINGS.cornerRadius, CORNER_RADII),
		refreshIntervalMinutes: allowedNumber(
			input.refreshIntervalMinutes,
			DEFAULT_SETTINGS.refreshIntervalMinutes,
			REFRESH_INTERVALS,
		),
		refreshPolicy: refreshPolicyValue(input.refreshPolicy, DEFAULT_SETTINGS.refreshPolicy),
		timeoutSeconds: allowedNumber(
			input.timeoutSeconds,
			DEFAULT_SETTINGS.timeoutSeconds,
			TIMEOUT_SECONDS,
		),
	};
}

function parseBoolean(value: string): boolean | undefined {
	if (value.toLowerCase() === 'true') return true;
	if (value.toLowerCase() === 'false') return false;
	return undefined;
}

function parseInteger(value: string, min: number, max: number): number | undefined {
	if (!/^\d+$/.test(value)) return undefined;
	const parsed = Number.parseInt(value, 10);
	return parsed >= min && parsed <= max ? parsed : undefined;
}

function parseAllowedInteger(value: string, allowed: readonly number[]): number | undefined {
	const parsed = parseInteger(value, Math.min(...allowed), Math.max(...allowed));
	return parsed !== undefined && allowed.includes(parsed) ? parsed : undefined;
}

export function parseBlockConfig(source: string): BlockOverrides {
	const overrides: BlockOverrides = {};

	for (const rawLine of source.split(/\r?\n/)) {
		const separator = rawLine.indexOf(':');
		if (separator < 0) continue;

		const key = rawLine.slice(0, separator).trim().toLowerCase();
		const value = rawLine.slice(separator + 1).trim();
		switch (key) {
			case 'username':
				overrides.username = value.slice(0, 100);
				break;
			case 'count': {
				const parsed = parseInteger(value, 1, 20);
				if (parsed !== undefined) overrides.count = parsed;
				break;
			}
			case 'layout':
				if (value === 'strip' || value === 'grid') overrides.layout = value;
				break;
			case 'render-mode':
				if (value === 'collage' || value === 'gallery') {
					overrides.renderMode = value;
					if (value === 'gallery') overrides.informationStyle = 'cards';
				}
				break;
			case 'information-style':
				if (value === 'none' || value === 'hover' || value === 'captions' || value === 'cards') {
					overrides.informationStyle = value;
					overrides.renderMode = value === 'cards' ? 'gallery' : 'collage';
				}
				break;
			case 'grid-columns': {
				const parsed = parseInteger(value, 2, 6);
				if (parsed !== undefined) overrides.gridColumns = parsed;
				break;
			}
			case 'gap': {
				const parsed = parseAllowedInteger(value, GAPS);
				if (parsed !== undefined) overrides.gap = parsed;
				break;
			}
			case 'heading':
				overrides.heading = value.slice(0, 120);
				break;
			case 'poster-size': {
				const parsed = parseInteger(value, 80, 220);
				if (parsed !== undefined && POSTER_SIZES.includes(parsed as (typeof POSTER_SIZES)[number])) {
					overrides.posterSize = parsed;
				}
				break;
			}
			case 'corner-radius': {
				const parsed = parseInteger(value, 0, 16);
				if (parsed !== undefined && CORNER_RADII.includes(parsed as (typeof CORNER_RADII)[number])) {
					overrides.cornerRadius = parsed;
				}
				break;
			}
			case 'refresh-interval': {
				const parsed = parseAllowedInteger(value, REFRESH_INTERVALS);
				if (parsed !== undefined) overrides.refreshIntervalMinutes = parsed;
				break;
			}
			case 'refresh-policy':
				if (value === 'open' || value === 'interval' || value === 'manual') {
					overrides.refreshPolicy = value;
				}
				break;
			case 'timeout': {
				const parsed = parseAllowedInteger(value, TIMEOUT_SECONDS);
				if (parsed !== undefined) overrides.timeoutSeconds = parsed;
				break;
			}
			case 'show-heading':
			case 'show-captions':
			case 'show-year':
			case 'show-rating':
			case 'show-date': {
				const parsed = parseBoolean(value);
				if (parsed === undefined) break;
				const property = key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) as
					| 'showHeading'
					| 'showCaptions'
					| 'showYear'
					| 'showRating'
					| 'showDate';
				overrides[property] = parsed;
				break;
			}
		}
	}

	return overrides;
}

export function resolveGalleryConfig(source: string, settings: PluginSettings): GalleryConfig {
	return { ...settings, ...parseBlockConfig(source) };
}

export function isValidUsername(username: string): boolean {
	return USERNAME_PATTERN.test(username);
}
