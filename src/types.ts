export type GalleryLayout = 'strip' | 'grid';
export type RenderMode = 'collage' | 'gallery';
export type InformationStyle = 'none' | 'hover' | 'captions' | 'cards';
export type RefreshPolicy = 'open' | 'interval' | 'manual';

export interface FilmEntry {
	title: string;
	year: number | null;
	watchedDate: string;
	rating: number | null;
	letterboxdUrl: string;
	tmdbId: number | null;
	posterUrl: string | null;
	guid: string | null;
	publishedAt: string | null;
}

export interface PluginSettings {
	username: string;
	count: number;
	layout: GalleryLayout;
	renderMode: RenderMode;
	informationStyle: InformationStyle;
	gap: number;
	heading: string;
	showHeading: boolean;
	showCaptions: boolean;
	showYear: boolean;
	showRating: boolean;
	showDate: boolean;
	posterSize: number;
	cornerRadius: number;
	refreshIntervalMinutes: number;
	refreshPolicy: RefreshPolicy;
	timeoutSeconds: number;
}

export type GalleryConfig = PluginSettings;

export interface CacheEntry {
	films: FilmEntry[];
	fetchedAt: number;
}

export interface PluginData {
	settings: PluginSettings;
	cache: Record<string, CacheEntry>;
}

export const POSTER_SIZES = [80, 100, 120, 140, 160, 180, 200, 220] as const;
export const CORNER_RADII = [0, 4, 6, 8, 12, 16] as const;
export const GAPS = [0, 2, 4, 8] as const;
export const REFRESH_INTERVALS = [5, 15, 30, 60, 180, 360, 720, 1440] as const;
export const TIMEOUT_SECONDS = [5, 10, 15, 20, 30] as const;

export const DEFAULT_SETTINGS: PluginSettings = {
	username: '',
	count: 6,
	layout: 'grid',
	renderMode: 'collage',
	informationStyle: 'none',
	gap: 4,
	heading: 'Recently watched',
	showHeading: false,
	showCaptions: false,
	showYear: false,
	showRating: false,
	showDate: false,
	posterSize: 120,
	cornerRadius: 6,
	refreshIntervalMinutes: 60,
	refreshPolicy: 'open',
	timeoutSeconds: 10,
};
