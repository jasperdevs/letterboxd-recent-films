import type { CollageAsset } from './collage';

export class CollageCache {
	private readonly assets = new Map<string, CollageAsset>();
	private readonly inFlight = new Map<string, Promise<CollageAsset>>();
	private readonly objectUrls = new Map<string, { url: string; revoke: () => void }>();
	private latest: CollageAsset | null = null;

	peek(key: string): CollageAsset | undefined {
		const asset = this.assets.get(key);
		if (asset) this.latest = asset;
		return asset;
	}

	async get(key: string, create: () => Promise<CollageAsset>): Promise<CollageAsset> {
		const cached = this.assets.get(key);
		if (cached) {
			this.latest = cached;
			return cached;
		}
		const pending = this.inFlight.get(key);
		if (pending) return pending;
		const request = create();
		this.inFlight.set(key, request);
		try {
			const asset = await request;
			this.assets.set(key, asset);
			this.latest = asset;
			while (this.assets.size > 24) {
				const oldest = this.assets.keys().next();
				if (oldest.done) break;
				this.assets.delete(oldest.value);
				this.objectUrls.get(oldest.value)?.revoke();
				this.objectUrls.delete(oldest.value);
			}
			return asset;
		} finally {
			this.inFlight.delete(key);
		}
	}

	latestBlob(): Blob | null {
		return this.latest?.blob ?? null;
	}

	objectUrl(key: string, document: Document): string {
		const existing = this.objectUrls.get(key);
		if (existing) return existing.url;
		const asset = this.assets.get(key);
		if (!asset) throw new Error('The collage image is not cached.');
		const urlApi = document.defaultView?.URL ?? URL;
		const url = urlApi.createObjectURL(asset.blob);
		this.objectUrls.set(key, { url, revoke: () => urlApi.revokeObjectURL(url) });
		return url;
	}

	clear(): void {
		for (const objectUrl of this.objectUrls.values()) objectUrl.revoke();
		this.objectUrls.clear();
		this.assets.clear();
		this.latest = null;
	}
}
