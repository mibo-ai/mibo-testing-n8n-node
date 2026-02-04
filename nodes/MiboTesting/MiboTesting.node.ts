import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { NodeOptions } from './types';
import { DEFAULT_SERVER_URL, DEFAULT_TIMEOUT_SECONDS } from './constants';
import { isValidUUID, normalizeServerUrl, findRequestIdInData } from './utils';
import { buildMetadata, buildTracePayload, buildOptimizedTracePayload } from './builders';
import type { NodeDataInput } from './types';
import { sendTrace, parseErrorResponse, calculatePayloadSize, formatBytes, getPayloadSizeWarning } from './mibo-client';

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
				displayName: 'Use Get Workflow Node',
				name: 'useGetWorkflow',
				type: 'boolean',
				default: false,
				description: 'Whether to use n8n\'s "Get Workflow" node to automatically detect nodes. Connect a "Get Workflow" node before this one.',
			},
			{
				displayName: 'Node Filter',
				name: 'nodeFilterPreset',
				type: 'options',
				default: 'all',
				description: 'Choose which nodes to capture from the workflow',
				displayOptions: {
					show: {
						useGetWorkflow: [true],
					},
				},
				options: [
					{
						name: 'All Nodes',
						value: 'all',
						description: 'Capture data from all workflow nodes',
					},
					{
						name: 'AI Nodes Only',
						value: 'ai',
						description: 'Only nodes with "AI" in their name',
					},
					{
						name: 'HTTP/Webhook Only',
						value: 'http',
						description: 'Only HTTP Request and Webhook nodes',
					},
					{
						name: 'Exclude Utility Nodes',
						value: 'excludeUtility',
						description: 'Exclude Set, If, Merge, Switch nodes',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Select specific nodes by name',
					},
				],
			},
			{
				displayName: 'Target Nodes',
				name: 'targetNodes',
				type: 'string',
				default: '',
				required: true,
				description: 'Names of the nodes to capture data from, separated by commas',
				placeholder: 'Webhook, HTTP Request, AI Agent',
				displayOptions: {
					show: {
						useGetWorkflow: [false],
					},
				},
			},
			{
				displayName: 'Custom Node Names',
				name: 'customTargetNodes',
				type: 'string',
				default: '',
				required: true,
				description: 'Names of the nodes to capture, separated by commas. Use expression {{ $json.nodes.map(n => n.name).join(\', \') }} to see all available nodes.',
				placeholder: 'Webhook, HTTP Request, AI Agent',
				displayOptions: {
					show: {
						useGetWorkflow: [true],
						nodeFilterPreset: ['custom'],
					},
				},
			},
			{
				displayName: 'Request ID',
				name: 'requestId',
				type: 'string',
				default: '',
				description: 'The x-request-id for correlating this trace with n8n executions. Required for active testing when triggered via HTTP/Webhook. Use expression: {{ $("Webhook").item.json.headers["x-request-id"] }}',
				placeholder: '={{ $("Webhook").item.json.headers["x-request-id"] }}',
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

		const useGetWorkflow = this.getNodeParameter('useGetWorkflow', 0, false) as boolean;
		let targetNodes: string[] = [];
		const nodeTypeMap: Record<string, string> = {};

		if (useGetWorkflow) {
			const nodeFilterPreset = this.getNodeParameter('nodeFilterPreset', 0, 'all') as string;
			const inputNodes = items[0]?.json?.nodes as Array<{ name: string; type: string }> | undefined;
			if (!inputNodes || !Array.isArray(inputNodes)) {
				throw new NodeOperationError(
					this.getNode(),
					'No workflow nodes found in input data',
					{
						description: 'Make sure to connect a "Get Workflow" node before this node. The input should contain a "nodes" array.',
					}
				);
			}

			const filteredInputNodes = inputNodes.filter(n => {
				const nodeType = n.type?.toLowerCase() || '';
				if (nodeType.includes('stickynote') || nodeType === 'custom.mibotesting') {
					return false;
				}

				nodeTypeMap[n.name] = n.type || 'unknown';
				return true;
			});

			if (nodeFilterPreset === 'custom') {
				const customTargetNodes = this.getNodeParameter('customTargetNodes', 0, '') as string;
				targetNodes = customTargetNodes
					.split(',')
					.map(name => name.trim())
					.filter(name => name.length > 0);
			} else {
				let filteredNodes = filteredInputNodes;
				switch (nodeFilterPreset) {
					case 'ai':
						filteredNodes = filteredInputNodes.filter(n => n.name.toLowerCase().includes('ai'));
						break;
					case 'http':
						filteredNodes = filteredInputNodes.filter(n => {
							const nodeType = n.type?.split('.').pop()?.toLowerCase() || '';
							return ['httprequest', 'webhook'].includes(nodeType);
						});
						break;
					case 'excludeUtility':
						filteredNodes = filteredInputNodes.filter(n => {
							const nodeType = n.type?.split('.').pop()?.toLowerCase() || '';
							return !['set', 'if', 'merge', 'switch'].includes(nodeType);
						});
						break;
				}

				targetNodes = filteredNodes.map(n => n.name);
			}
		} else {
			const targetNodesInput = this.getNodeParameter('targetNodes', 0, '') as string;
			targetNodes = targetNodesInput
				.split(',')
				.map(name => name.trim())
				.filter(name => name.length > 0);
		}

		if (targetNodes.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'No target nodes configured',
				{
					description: useGetWorkflow
						? 'No nodes matched the selected filter. Try a different filter or check that the Get Workflow node is providing data.'
						: 'Enter node names separated by commas. Example: "Webhook, HTTP Request, AI Agent"',
				}
			);
		}

		const credentials = await this.getCredentials('miboTestingApi');
		const platformId = this.getNodeParameter('platformId', 0, '') as string;
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
		const nodesData: NodeDataInput[] = [];
		const nodesNotFound: string[] = [];
		const nodesNotExecuted: string[] = [];

		const manualRequestId = this.getNodeParameter('requestId', 0, '') as string;
		let requestId: string | undefined = manualRequestId || undefined;

		if (!requestId) {
			for (const item of items) {
				requestId = findRequestIdInData(item.json as IDataObject);
				if (requestId) {
					break;
				}
			}
		}

		if (!requestId && useGetWorkflow) {
			const inputNodes = items[0]?.json?.nodes as Array<{ name: string; type: string }> | undefined;
			if (inputNodes) {
				const webhookNodes = inputNodes.filter(n => {
					const nodeType = n.type?.split('.').pop()?.toLowerCase() || '';
					return nodeType === 'webhook';
				});

				for (const webhookNode of webhookNodes) {
					try {
						const webhookItems = proxy.$items(webhookNode.name);
						if (webhookItems && webhookItems.length > 0) {
							for (const webhookItem of webhookItems) {
								requestId = findRequestIdInData(webhookItem.json as IDataObject);
								if (requestId) {
									break;
								}
							}
						}
					} catch {
						// Webhook node not executed in this branch
					}
					
					if (requestId) {
						break;
					}
				}
			}
		}

		const externalId = requestId;
		for (const nodeName of targetNodes) {
			const nodeProxy = proxy.$node[nodeName];
			if (!nodeProxy) {
				nodesNotFound.push(nodeName);
				continue;
			}

			const nodeType = nodeTypeMap[nodeName] || 'unknown';

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
						type: nodeType,
					});
				} else {
					nodesNotExecuted.push(nodeName);
					nodesData.push({
						nodeName,
						items: [],
						type: nodeType,
						_notExecuted: true,
					});
				}
			} catch {
				try {
					const nodeJson = nodeProxy.json as IDataObject;
					nodesData.push({
						nodeName,
						items: [nodeJson],
						type: nodeType,
					});

					if (!requestId) {
						requestId = findRequestIdInData(nodeJson);
					}
				} catch {
					nodesNotExecuted.push(nodeName);
					nodesData.push({
						nodeName,
						items: [],
						type: nodeType,
						_notExecuted: true,
					});
				}
			}
		}

		if (nodesNotFound.length > 0) {
			throw new NodeOperationError(
				this.getNode(),
				`Nodes not found in workflow: '${nodesNotFound.join("', '")}'`,
				{
					description: 'Check the exact node names. Node names are case-sensitive and must match exactly as they appear in your workflow.',
				}
			);
		}

		// Use optimized trace format when using Get Workflow mode
		const tracePayload = useGetWorkflow
			? buildOptimizedTracePayload(
					nodesData,
					workflowId,
					workflowName,
					timestamp,
					platformId,
					includeMetadata ? metadata : undefined,
				)
			: buildTracePayload(
					inputData,
					workflowId,
					metadata,
					platformId,
					externalId || '',
					nodesData,
				);

		const serverUrl = normalizeServerUrl(
			options.serverUrl || credentials.serverUrl as string || DEFAULT_SERVER_URL
		);
		const timeout = (options.timeout || DEFAULT_TIMEOUT_SECONDS) * 1000;

		const payloadSize = calculatePayloadSize(tracePayload);
		const payloadSizeFormatted = formatBytes(payloadSize);
		const payloadWarning = getPayloadSizeWarning(payloadSize);

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
				const traceInfo: IDataObject = {
					sent: true,
					traceId: response?.data?.id || 'unknown',
					platformId: platformId || 'resolved-from-api-key',
					requestId: requestId || null,
					timestamp,
					nodesCollected: nodesData.filter(n => !n._notExecuted).length,
					targetNodes: targetNodes,
					payloadSize: payloadSizeFormatted,
				};

				if (payloadWarning) {
					traceInfo.payloadWarning = payloadWarning;
				}

				if (nodesNotExecuted.length > 0) {
					traceInfo.warning = `Some nodes did not execute in this workflow branch: ${nodesNotExecuted.join(', ')}`;
					traceInfo.nodesNotExecuted = nodesNotExecuted;
				}

				returnData.push({
					json: {
						...items[i].json,
						_miboTrace: traceInfo,
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
								requestId: requestId || null,
								timestamp,
								targetNodes: targetNodes,
								payloadSize: payloadSizeFormatted,
							},
						},
						pairedItem: { item: i },
					});
				}
			} else {
				const isPayloadTooLarge = errorMessage.toLowerCase().includes('too large');
				throw new NodeOperationError(
					this.getNode(),
					`Failed to send trace to Mibo Testing: ${errorMessage}`,
					{
						description: isPayloadTooLarge
							? 'Try reducing the number of target nodes or exclude nodes with large data (files, images, etc.)'
							: 'Check your API key and server URL in the credentials',
					}
				);
			}
		}

		return [returnData];
	}
}
