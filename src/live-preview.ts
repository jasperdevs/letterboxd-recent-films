import { StateField, type EditorState, type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { findGalleryCodeBlocks } from './code-blocks';
import type { GalleryView } from './renderer';

export interface LivePreviewGalleryHandle {
	view: GalleryView;
	destroy: () => void;
}

type GalleryFactory = (
	container: HTMLElement,
	source: string,
	notifyLayout?: () => void,
) => LivePreviewGalleryHandle;

class GalleryWidget extends WidgetType {
	private handle: LivePreviewGalleryHandle | null = null;

	constructor(
		private readonly source: string,
		private readonly createGallery: GalleryFactory,
	) {
		super();
	}

	eq(other: GalleryWidget): boolean {
		return other.source === this.source;
	}

	toDOM(view: EditorView): HTMLElement {
		const container = view.dom.ownerDocument.createElement('div');
		container.addClass('lrf-live-preview');
		this.handle = this.createGallery(container, this.source, () => view.requestMeasure());
		void this.handle.view.refresh();
		return container;
	}

	destroy(): void {
		this.handle?.destroy();
		this.handle = null;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

function buildDecorations(state: EditorState, createGallery: GalleryFactory): DecorationSet {
	const ranges = findGalleryCodeBlocks(state.doc.toString()).map((block) =>
		Decoration.replace({
			block: true,
			widget: new GalleryWidget(block.source, createGallery),
		}).range(block.from, block.to),
	);
	return Decoration.set(ranges, true);
}

export function createLivePreviewExtension(createGallery: GalleryFactory): Extension {
	return StateField.define<DecorationSet>({
		create: (state) => buildDecorations(state, createGallery),
		update: (decorations, transaction) => transaction.docChanged
			? buildDecorations(transaction.state, createGallery)
			: decorations,
		provide: (field) => EditorView.decorations.from(field),
	});
}
