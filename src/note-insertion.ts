export interface TopInsertion {
	duplicate: boolean;
	offset: number;
	text: string;
}

export function createGalleryBlock(): string {
	return '```letterboxd-recent\n```';
}

export function containsGalleryBlock(source: string): boolean {
	return /(?:^|\r?\n)[ \t]*```letterboxd-recent(?:[ \t].*)?(?=\r?\n|$)/.test(source);
}

function frontmatterEndOffset(source: string): number | null {
	const start = source.match(/^(?:\uFEFF)?---[ \t]*(?:\r?\n|$)/);
	if (!start || !start[0].endsWith('\n')) return null;

	let offset = start[0].length;
	while (offset <= source.length) {
		const nextNewline = source.indexOf('\n', offset);
		const lineEnd = nextNewline === -1 ? source.length : nextNewline;
		const line = source.slice(offset, lineEnd).replace(/\r$/, '');
		if (line === '---' || line === '...') {
			return nextNewline === -1 ? lineEnd : lineEnd + 1;
		}
		if (nextNewline === -1) break;
		offset = nextNewline + 1;
	}
	return null;
}

export function planGalleryInsertionAtTop(source: string): TopInsertion {
	if (containsGalleryBlock(source)) return { duplicate: true, offset: 0, text: '' };

	const newline = source.includes('\r\n') ? '\r\n' : '\n';
	const block = createGalleryBlock().replaceAll('\n', newline);
	const frontmatterEnd = frontmatterEndOffset(source);
	if (frontmatterEnd !== null) {
		const needsLeadingNewline = frontmatterEnd === source.length && !source.endsWith(newline);
		return {
			duplicate: false,
			offset: frontmatterEnd,
			text: `${needsLeadingNewline ? newline : ''}${block}${newline}${newline}`,
		};
	}

	return {
		duplicate: false,
		offset: source.startsWith('\uFEFF') ? 1 : 0,
		text: source.length > 0 ? `${block}${newline}${newline}` : `${block}${newline}`,
	};
}
