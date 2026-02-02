import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const DEFAULT_SERVER_URL = 'https://api.mibo-ai.com';
const DEFAULT_TIMEOUT_SECONDS = 30;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EXTERNAL_ID_LENGTH = 255;

const ERROR_CODES = {
	MISSING_API_KEY: 'Missing x-api-key header. Make sure you are sending the API key in the headers.',
	INVALID_API_KEY: 'The API key does not exist or has been revoked. Verify that you are using a valid API key.',
	VALIDATION_ERROR: 'The request body failed validation.',
	PLATFORM_NOT_FOUND: {
		withRestrictions: 'The API key is restricted to specific platforms. Verify that the platformId matches one of the allowed platforms.',
		withoutRestrictions: 'Could not determine the target platform. Send a platformId in the body, or restrict the API key to a single platform.',
	},
	AUTH_ERROR: 'Internal error while validating the API key. Contact support.',
	INTERNAL_SERVER_ERROR: 'Unexpected server error. Contact support if it persists.',
} as const;

interface MiboErrorResponse {
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

interface MiboSuccessResponse {
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

interface TracePayload {
	data: {
		input: IDataObject[];
		nodes?: IDataObject[];
	};
	externalMetadata: {
		workflowId: string;
	};
	metadata: IDataObject;
	platformId?: string;
	externalId?: string;
}

interface NodeOptions {
	serverUrl?: string;
	timeout?: number;
}

interface MetadataFields {
	environment?: string;
	version?: string;
	additionalFields?: string | IDataObject;
}

function isValidUUID(value: string): boolean {
	return UUID_REGEX.test(value);
}

function normalizeServerUrl(url: string): string {
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

function findRequestIdInData(data: IDataObject): string | undefined {
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

function parseErrorResponse(error: unknown): string {
	const err = error as { response?: { data?: MiboErrorResponse }; message?: string };
	const errorData = err.response?.data;

	if (errorData?.error?.code) {
		const code = errorData.error.code;
		let baseMessage: string;
		if (code === 'PLATFORM_NOT_FOUND') {
			const serverMessage = errorData.error.message || '';
			const hasRestrictions = serverMessage.toLowerCase().includes('restricted') ||
				serverMessage.toLowerCase().includes('allowed');
			baseMessage = hasRestrictions
				? ERROR_CODES.PLATFORM_NOT_FOUND.withRestrictions
				: ERROR_CODES.PLATFORM_NOT_FOUND.withoutRestrictions;
		} else {
			const errorCode = ERROR_CODES[code as keyof typeof ERROR_CODES];
			baseMessage = (typeof errorCode === 'string' ? errorCode : null) || errorData.error.message;
		}

		if (errorData.error.details?.length) {
			const details = errorData.error.details
				.map(d => `${d.path}: ${d.msg}`)
				.join('; ');
			return `${baseMessage} Details: ${details}`;
		}

		return baseMessage;
	}

	return err.message || 'Unknown error while sending the trace';
}

function buildMetadata(
	workflowId: string,
	workflowName: string,
	timestamp: string,
	includeMetadata: boolean,
	metadataConfig: IDataObject,
	node: IExecuteFunctions,
): IDataObject {
	const metadata: IDataObject = {
		workflowId,
		workflowName,
		timestamp,
	};

	if (!includeMetadata) {
		return metadata;
	}

	const fields = metadataConfig.fields as MetadataFields | undefined;
	if (!fields) {
		return metadata;
	}

	if (fields.environment) {
		metadata.environment = fields.environment;
	}

	if (fields.version) {
		metadata.version = fields.version;
	}

	if (fields.additionalFields) {
		try {
			const additionalFields = typeof fields.additionalFields === 'string'
				? JSON.parse(fields.additionalFields)
				: fields.additionalFields;
			Object.assign(metadata, additionalFields);
		} catch {
			throw new NodeOperationError(
				node.getNode(),
				'Invalid JSON in Additional Fields',
				{ description: 'Please ensure the Additional Fields contains valid JSON' }
			);
		}
	}

	return metadata;
}

function buildTracePayload(
	inputData: IDataObject[],
	workflowId: string,
	metadata: IDataObject,
	platformId: string,
	externalId: string,
	nodesData?: IDataObject[],
): TracePayload {
	const payload: TracePayload = {
		data: {
			input: inputData,
		},
		externalMetadata: {
			workflowId,
		},
		metadata,
	};

	if (nodesData && nodesData.length > 0) {
		payload.data.nodes = nodesData;
	}

	if (platformId) {
		payload.platformId = platformId;
	}

	if (externalId) {
		payload.externalId = externalId;
	}

	return payload;
}

async function sendTrace(
	node: IExecuteFunctions,
	serverUrl: string,
	apiKey: string,
	payload: TracePayload,
	timeout: number,
	requestId?: string,
): Promise<MiboSuccessResponse> {
	const headers: IDataObject = {
		'x-api-key': apiKey,
		'Content-Type': 'application/json',
	};

	if (requestId) {
		headers['x-request-id'] = requestId;
	}

	return node.helpers.httpRequest({
		method: 'POST' as IHttpRequestMethods,
		url: `${serverUrl}/traces`,
		headers,
		body: payload,
		json: true,
		timeout,
	});
}

export class MiboTesting implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mibo Testing',
		name: 'miboTesting',
		icon: 'file:mibo-testing.svg',
		group: ['output'],
		version: 1,
		description: 'Capture and send workflow traces to Mibo Testing for semantic and procedural testing',
		defaults: {
			name: 'Mibo Testing',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'miboTestingApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Target Nodes',
				name: 'targetNodes',
				type: 'string',
				default: '',
				required: true,
				description: 'Names of the nodes to capture data from, separated by commas. Use the exact names as they appear in your workflow. If you have created test cases in Mibo, these nodes should match for procedural testing. Semantic testing uses the final output.',
				placeholder: 'e.g., Webhook, HTTP Request, AI Agent',
				hint: 'Enter the exact node names separated by commas',
			},
			{
				displayName: 'Platform ID',
				name: 'platformId',
				type: 'string',
				default: '',
				description: 'The unique identifier for your platform in Mibo Testing (UUID format)',
				placeholder: 'e.g., 550e8400-e29b-41d4-a716-446655440000',
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'Your custom trace identifier (max 255 characters)',
				placeholder: 'e.g., trace-123',
			},
			{
				displayName: 'Include Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: false,
				description: 'Whether to include additional metadata with the trace',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				displayOptions: {
					show: {
						includeMetadata: [true],
					},
				},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						values: [
							{
								displayName: 'Environment',
								name: 'environment',
								type: 'string',
								default: 'production',
								description: 'The environment where the workflow is running',
							},
							{
								displayName: 'Version',
								name: 'version',
								type: 'string',
								default: '1.0.0',
								description: 'The version of your workflow or application',
							},
							{
								displayName: 'Additional Fields',
								name: 'additionalFields',
								type: 'json',
								default: '{}',
								description: 'Any additional metadata fields (JSON format)',
								placeholder: '{"team": "backend", "feature": "user-auth"}',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Custom Server URL',
						name: 'serverUrl',
						type: 'string',
						default: '',
						description: 'Override the default server URL from credentials. Leave empty to use the credential URL.',
						placeholder: 'https://custom.mibo-ai.com',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						default: DEFAULT_TIMEOUT_SECONDS,
						description: 'Maximum time to wait for the server response',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const targetNodesInput = this.getNodeParameter('targetNodes', 0, '') as string;
		const targetNodes = targetNodesInput
			.split(',')
			.map(name => name.trim())
			.filter(name => name.length > 0);

		if (targetNodes.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'You must specify at least one target node',
				{
					description: 'Enter the names of the nodes you want to capture data from, separated by commas. Example: "Webhook, HTTP Request, AI Agent"',
				}
			);
		}

		const credentials = await this.getCredentials('miboTestingApi');
		const platformId = this.getNodeParameter('platformId', 0, '') as string;
		const externalId = this.getNodeParameter('externalId', 0, '') as string;
		const includeMetadata = this.getNodeParameter('includeMetadata', 0, false) as boolean;
		const options = this.getNodeParameter('options', 0, {}) as NodeOptions;
		if (platformId && !isValidUUID(platformId)) {
			throw new NodeOperationError(
				this.getNode(),
				'Platform ID must be a valid UUID',
				{
					description: 'The Platform ID must be in UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)',
				}
			);
		}

		if (externalId && externalId.length > MAX_EXTERNAL_ID_LENGTH) {
			throw new NodeOperationError(
				this.getNode(),
				`External ID must not exceed ${MAX_EXTERNAL_ID_LENGTH} characters`,
				{
					description: `The External ID is ${externalId.length} characters long. Maximum allowed is ${MAX_EXTERNAL_ID_LENGTH}.`,
				}
			);
		}

		const workflowData = this.getWorkflow();
		const workflowId = workflowData.id || 'unknown';
		const workflowName = workflowData.name || 'Unnamed Workflow';
		const timestamp = new Date().toISOString();
		const inputData: IDataObject[] = items.map(item => item.json as IDataObject);
		const metadataConfig = includeMetadata
			? this.getNodeParameter('metadata', 0, {}) as IDataObject
			: {};
		const metadata = buildMetadata(
			workflowId,
			workflowName,
			timestamp,
			includeMetadata,
			metadataConfig,
			this,
		);

		const proxy = this.getWorkflowDataProxy(0);
		const nodesData: IDataObject[] = [];
		let requestId: string | undefined;

		for (const item of items) {
			requestId = findRequestIdInData(item.json as IDataObject);
			if (requestId) {
				break;
			}
		}

		for (const nodeName of targetNodes) {
			const nodeProxy = proxy.$node[nodeName];
			if (nodeProxy) {
				try {
					const nodeItems = proxy.$items(nodeName);
					if (nodeItems && nodeItems.length > 0) {
						const nodeItemsData: IDataObject[] = [];
						for (const nodeItem of nodeItems) {
							const itemJson = nodeItem.json as IDataObject;
							nodeItemsData.push(itemJson);

							if (!requestId) {
								requestId = findRequestIdInData(itemJson);
							}
						}
						nodesData.push({
							nodeName,
							items: nodeItemsData,
						});
					}
				} catch {
					try {
						const nodeJson = nodeProxy.json as IDataObject;
						nodesData.push({
							nodeName,
							items: [nodeJson],
						});

						if (!requestId) {
							requestId = findRequestIdInData(nodeJson);
						}
					} catch {
						// Could not access node data
					}
				}
			}
		}

		const tracePayload = buildTracePayload(
			inputData,
			workflowId,
			metadata,
			platformId,
			externalId,
			nodesData,
		);

		const serverUrl = normalizeServerUrl(
			options.serverUrl || credentials.serverUrl as string || DEFAULT_SERVER_URL
		);
		const timeout = (options.timeout || DEFAULT_TIMEOUT_SECONDS) * 1000;
		try {
			const response = await sendTrace(
				this,
				serverUrl,
				credentials.apiKey as string,
				tracePayload,
				timeout,
				requestId,
			);

			for (let i = 0; i < items.length; i++) {
				returnData.push({
					json: {
						...items[i].json,
						_miboTrace: {
							sent: true,
							traceId: response?.data?.id || 'unknown',
							platformId: platformId || 'resolved-from-api-key',
							timestamp,
							nodesCollected: nodesData.length,
						},
					},
					pairedItem: { item: i },
				});
			}
		} catch (error: unknown) {
			const errorMessage = parseErrorResponse(error);

			if (this.continueOnFail()) {
				for (let i = 0; i < items.length; i++) {
					returnData.push({
						json: {
							...items[i].json,
							_miboTrace: {
								sent: false,
								error: errorMessage,
								platformId: platformId || 'unknown',
								timestamp,
							},
						},
						pairedItem: { item: i },
					});
				}
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`Failed to send trace to Mibo Testing: ${errorMessage}`,
					{
						description: 'Check your API key and server URL in the credentials',
					}
				);
			}
		}

		return [returnData];
	}
}
