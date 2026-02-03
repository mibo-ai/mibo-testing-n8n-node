import type { IDataObject } from 'n8n-workflow';
import { UUID_REGEX } from './constants';

export function isValidUUID(value: string): boolean {
	return UUID_REGEX.test(value);
}

export function normalizeServerUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

function extractRequestIdFromHeaders(headers: IDataObject | undefined): string | undefined {
	if (!headers) {
		return undefined;
	}

	const headerKey = Object.keys(headers).find(
		key => key.toLowerCase() === 'x-request-id'
	);

	return headerKey ? (headers[headerKey] as string) : undefined;
}

export function findRequestIdInData(data: IDataObject): string | undefined {
	if (data.headers) {
		const requestId = extractRequestIdFromHeaders(data.headers as IDataObject);
		if (requestId) return requestId;
	}

	for (const value of Object.values(data)) {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			const requestId = findRequestIdInData(value as IDataObject);
			if (requestId) {
				return requestId;
			}
		}
	}

	return undefined;
}