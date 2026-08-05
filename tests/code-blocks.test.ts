import { describe, expect, it } from 'vitest';
import { findGalleryCodeBlocks } from '../src/code-blocks';

describe('Live Preview gallery block discovery', () => {
	it('finds complete gallery blocks and extracts their configuration', () => {
		const markdown = [
			'# Note',
			'',
			'```letterboxd-recent',
			'username: movie_fan',
			'count: 6',
			'```',
			'',
			'Keep this text.',
		].join('\n');
		const blocks = findGalleryCodeBlocks(markdown);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.source).toBe('username: movie_fan\ncount: 6\n');
		expect(markdown.slice(blocks[0]?.from, blocks[0]?.to)).toBe(
			'```letterboxd-recent\nusername: movie_fan\ncount: 6\n```',
		);
	});

	it('ignores unfinished blocks and other code languages', () => {
		const markdown = '```typescript\nconst value = 1;\n```\n\n```letterboxd-recent\ncount: 6';
		expect(findGalleryCodeBlocks(markdown)).toEqual([]);
	});
});
