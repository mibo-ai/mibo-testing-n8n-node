import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  Icon,
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
      description:
        'Your Mibo Testing API key. You can find this in your Mibo Testing dashboard under Settings > API Keys.',
    },
    {
      displayName: 'n8n API Key (Optional)',
      name: 'n8nApiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description:
        'Your n8n instance API key. This allows Mibo Testing to automatically read your workflow structure without needing an extra "Get Workflow" node. To create one: open your n8n instance, go to Settings > API, and click "Create an API Key".',
    },
    {
      displayName: 'n8n Base URL (Optional)',
      name: 'n8nBaseUrl',
      type: 'string',
      default: '',
      placeholder: 'http://localhost:5678',
      description:
        'The URL where your n8n instance is running. Examples: "http://localhost:5678" for local setups, "https://your-n8n.example.com" for self-hosted, or your n8n Cloud URL.',
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
      baseURL: 'https://api.mibo-ai.com',
      url: '/health',
      method: 'GET',
    },
  };
}
