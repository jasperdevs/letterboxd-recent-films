import { describe, expect, it } from 'vitest';
import {
	containsGalleryBlock,
	planGalleryInsertionAtTop,
} from '../src/note-insertion';

function applyPlan(source: string): string {
	const plan = planGalleryInsertionAtTop(source);
	return source.slice(0, plan.offset) + plan.text + source.slice(plan.offset);
}

describe('gallery note insertion', () => {
	it('inserts at the start when there is no frontmatter', () => {
		const source = '# Existing heading\n\nKeep this paragraph exactly.\n';
		expect(applyPlan(source)).toBe(
			'```letterboxd-recent\n```\n\n# Existing heading\n\nKeep this paragraph exactly.\n',
		);
	});

	it('inserts after YAML frontmatter and preserves CRLF text', () => {
		const source = '---\r\ntitle: Existing note\r\ntags:\r\n  - film\r\n---\r\n# Heading\r\nBody\r\n';
		expect(applyPlan(source)).toBe(
			'---\r\ntitle: Existing note\r\ntags:\r\n  - film\r\n---\r\n```letterboxd-recent\r\n```\r\n\r\n# Heading\r\nBody\r\n',
		);
	});

	it('handles frontmatter whose closing delimiter is at end of file', () => {
		const source = '---\ntitle: Note\n---';
		expect(applyPlan(source)).toBe('---\ntitle: Note\n---\n```letterboxd-recent\n```\n\n');
	});

	it('detects an existing block and plans no edit', () => {
		const source = '# Note\n\n```letterboxd-recent\ncount: 4\n```\n\nKeep me.';
		expect(containsGalleryBlock(source)).toBe(true);
		expect(planGalleryInsertionAtTop(source)).toEqual({ duplicate: true, offset: 0, text: '' });
	});

	it('does not duplicate an unfinished existing block', () => {
		const source = '# Note\n\n```letterboxd-recent\ncount: 4';
		expect(planGalleryInsertionAtTop(source).duplicate).toBe(true);
	});
});
