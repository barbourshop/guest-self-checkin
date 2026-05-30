/**
 * Trigger a file download in the browser / Electron renderer (uses Downloads folder).
 */
export function downloadBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = fileName;
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

/** Parse filename from Content-Disposition (attachment; filename="..."). */
export function filenameFromContentDisposition(
	header: string | null,
	fallback: string
): string {
	if (!header) return fallback;
	const quoted = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(header);
	if (quoted?.[1]) {
		try {
			return decodeURIComponent(quoted[1].replace(/"/g, '').trim());
		} catch {
			return quoted[1].replace(/"/g, '').trim();
		}
	}
	return fallback;
}

/** GET a report endpoint and save the response as a downloaded file. */
export async function downloadReportFromApi(
	url: string,
	fallbackFileName: string
): Promise<{ fileName: string; rowCount: number | null }> {
	const response = await fetch(url);
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		const message =
			typeof body?.error === 'string'
				? body.error
				: `Download failed (${response.status})`;
		throw new Error(message);
	}

	const blob = await response.blob();
	const fileName = filenameFromContentDisposition(
		response.headers.get('Content-Disposition'),
		fallbackFileName
	);
	const rowCountHeader = response.headers.get('X-Report-Row-Count');
	const rowCount = rowCountHeader != null ? Number(rowCountHeader) : null;

	downloadBlob(blob, fileName);

	return {
		fileName,
		rowCount: Number.isFinite(rowCount) ? rowCount : null
	};
}
