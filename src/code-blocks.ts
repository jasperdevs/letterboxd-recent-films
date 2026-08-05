export interface GalleryCodeBlock {
	from: number;
	to: number;
	source: string;
}

const GALLERY_BLOCK_PATTERN = /^```letterboxd-recent[\t ]*\r?\n([\s\S]*?)^```[\t ]*(?=\r?$)/gm;

export function findGalleryCodeBlocks(markdown: string): GalleryCodeBlock[] {
	const blocks: GalleryCodeBlock[] = [];
	for (const match of markdown.matchAll(GALLERY_BLOCK_PATTERN)) {
		if (match.index === undefined) continue;
		blocks.push({
			from: match.index,
			to: match.index + match[0].length,
			source: match[1] ?? '',
		});
	}
	return blocks;
}
