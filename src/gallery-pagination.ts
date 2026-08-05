export function pageCount(totalItems: number, pageSize: number): number {
	return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPage(page: number, totalItems: number, pageSize: number): number {
	return Math.max(0, Math.min(pageCount(totalItems, pageSize) - 1, page));
}

export function pageItems<T>(items: T[], page: number, pageSize: number): T[] {
	const safePage = clampPage(page, items.length, pageSize);
	const start = safePage * pageSize;
	return items.slice(start, start + pageSize);
}
