import {
	CORNER_RADII,
	DEFAULT_SETTINGS,
	GALLERY_WIDTHS,
	GAPS,
	REFRESH_INTERVALS,
	TIMEOUT_SECONDS,
	type GalleryConfig,
	type PluginSettings,
	type RefreshPolicy,
} from './types';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{2,15}$/;

type BlockOverrides = Partial<GalleryConfig>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function countValue(value: unknown): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return DEFAULT_SETTINGS.count;
	if (value === 0) return 0;
	return Math.min(value, 20);
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

function refreshPolicyValue(value: unknown, fallback: RefreshPolicy): RefreshPolicy {
	return value === 'open' || value === 'interval' || value === 'manual' ? value : fallback;
}

export function normalizeSettings(value: unknown): PluginSettings {
	const input = isRecord(value) ? value : {};
	return {
		username: stringValue(input.username, DEFAULT_SETTINGS.username, 15).trim(),
		count: countValue(input.count),
		gap: allowedNumber(input.gap, DEFAULT_SETTINGS.gap, GAPS),
		heading: stringValue(input.heading, DEFAULT_SETTINGS.heading, 120),
		showHeading: booleanValue(input.showHeading, DEFAULT_SETTINGS.showHeading),
		showCaptions: booleanValue(input.showCaptions, DEFAULT_SETTINGS.showCaptions),
		showYear: booleanValue(input.showYear, DEFAULT_SETTINGS.showYear),
		showRating: booleanValue(input.showRating, DEFAULT_SETTINGS.showRating),
		showDate: booleanValue(input.showDate, DEFAULT_SETTINGS.showDate),
		galleryWidth: allowedNumber(input.galleryWidth, DEFAULT_SETTINGS.galleryWidth, GALLERY_WIDTHS),
		autoSize: booleanValue(input.autoSize, DEFAULT_SETTINGS.autoSize),
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
	let hasAutoSizeOverride = false;

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
				if (value.toLowerCase() === 'max') {
					overrides.count = 0;
					break;
				}
				const parsed = parseInteger(value, 1, 20);
				if (parsed !== undefined) overrides.count = parsed;
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
			case 'gallery-width': {
				const parsed = parseAllowedInteger(value, GALLERY_WIDTHS);
				if (parsed !== undefined) overrides.galleryWidth = parsed;
				break;
			}
			case 'auto-size': {
				const parsed = parseBoolean(value);
				if (parsed !== undefined) {
					overrides.autoSize = parsed;
					hasAutoSizeOverride = true;
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
	if (overrides.galleryWidth !== undefined && !hasAutoSizeOverride) overrides.autoSize = false;

	return overrides;
}

export function resolveGalleryConfig(source: string, settings: PluginSettings): GalleryConfig {
	return { ...settings, ...parseBlockConfig(source) };
}

export function isValidUsername(username: string): boolean {
	return USERNAME_PATTERN.test(username);
}
