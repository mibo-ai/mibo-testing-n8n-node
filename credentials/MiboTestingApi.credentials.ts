import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MiboTestingApi implements ICredentialType {
	name = 'miboTestingApi';
	displayName = 'Mibo Testing API';
	documentationUrl = 'https://docs.mibo-testing.com/integrations/n8n';
	icon? = 'file:mibo-testing.svg' as Icon;
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Mibo Testing API key. You can find this in your Mibo Testing dashboard under Settings > API Keys.',
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'https://api.mibo-ai.com',
			description: 'The Mibo Testing server URL. Only change this if you are using a self-hosted instance.',
		},
		// Optional n8n API fields for enhanced node selection
		{
			displayName: 'n8n API Key (Optional)',
			name: 'n8nApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your n8n API key for automatic node selection. Create one in n8n Settings > API. Leave empty to use manual node entry.',
		},
		{
			displayName: 'n8n Base URL',
			name: 'n8nBaseUrl',
			type: 'string',
			default: 'http://localhost:5678',
			description: 'The base URL of your n8n instance. Only needed if you set an n8n API Key.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials?.apiKey}}',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.serverUrl}}',
			url: '/health',
			method: 'GET',
		},
	};
}
