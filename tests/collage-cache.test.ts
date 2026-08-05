import { describe, expect, it, vi } from 'vitest';
import { CollageCache } from '../src/collage-cache';
import type { CollageAsset } from '../src/collage';

const asset: CollageAsset = {
	blob: new Blob(['png'], { type: 'image/png' }),
	featured: false,
	columns: 1,
	rows: 1,
	posterWidth: 140,
	posterHeight: 210,
	captionHeight: 0,
	cellHeight: 210,
	width: 140,
	height: 210,
	gap: 0,
};

describe('collage memory cache', () => {
	it('shares composition work and reuses the completed PNG', async () => {
		const cache = new CollageCache();
		const create = vi.fn(async () => asset);
		const [first, second] = await Promise.all([cache.get('same', create), cache.get('same', create)]);
		expect(create).toHaveBeenCalledOnce();
		expect(first).toBe(asset);
		expect(second).toBe(asset);
		expect(cache.peek('same')).toBe(asset);
		expect(cache.latestBlob()).toBe(asset.blob);
		const createObjectURL = vi.fn(() => 'blob:stable-collage');
		const revokeObjectURL = vi.fn();
		const document = {
			defaultView: { URL: { createObjectURL, revokeObjectURL } },
		} as unknown as Document;
		expect(cache.objectUrl('same', document)).toBe('blob:stable-collage');
		expect(cache.objectUrl('same', document)).toBe('blob:stable-collage');
		expect(createObjectURL).toHaveBeenCalledOnce();
		cache.clear();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:stable-collage');
		expect(cache.latestBlob()).toBeNull();
	});
});
