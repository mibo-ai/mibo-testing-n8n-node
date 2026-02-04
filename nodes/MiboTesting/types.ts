import type { IDataObject } from 'n8n-workflow';

export interface MiboErrorResponse {
	success: false;
	timestamp: string;
	error: {
		code: string;
		message: string;
		details?: Array<{
			type: string;
			msg: string;
			path: string;
			location: string;
		}>;
	};
}

export interface MiboSuccessResponse {
	success: boolean;
	data: {
		id: string;
		platformId: string;
		externalId?: string;
		status: string;
		createdAt: string;
		updatedAt: string;
	};
	message: string;
	timestamp: string;
}

export interface NodeDataInput {
	nodeName: string;
	items: IDataObject[];
	type?: string;
	_notExecuted?: boolean;
}

export interface TracePayload {
	data: {
		input: IDataObject[];
		nodes?: NodeDataInput[];
	};
	externalMetadata: {
		workflowId: string;
	};
	metadata: IDataObject;
	platformId?: string;
	externalId?: string;
}

export interface NodeOptions {
	serverUrl?: string;
	timeout?: number;
}

export interface MetadataFields {
	environment?: string;
	version?: string;
	additionalFields?: string | IDataObject;
}

export interface OptimizedNodeData {
	output: IDataObject | IDataObject[];
	type: string;
	status: 'success' | 'skipped';
}

export interface OptimizedTracePayload {
	status: 'success' | 'partial';
	data: Record<string, OptimizedNodeData>;
	metadata: {
		workflow_id: string;
		workflow_name: string;
		timestamp: string;
		[key: string]: unknown;
	};
	platformId?: string;
}