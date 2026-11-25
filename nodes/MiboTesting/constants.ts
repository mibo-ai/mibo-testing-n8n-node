export const DEFAULT_SERVER_URL = 'https://api.mibo-ai.com';
export const MIBO_APP_URL = 'https://app.mibo-ai.com';
export const DOCS_URL = 'https://docs.mibo-ai.com/n8n-node/setup/';
export const DEFAULT_TIMEOUT_SECONDS = 30;
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MAX_PAYLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_PAYLOAD_SIZE_MB = 10;

export const AUTO_EXCLUDED_NODE_TYPES = [
  'n8n-nodes-base.stickyNote',
  'n8n-nodes-base.n8n',
  'n8n-nodes-base.respondToWebhook',
  'n8n-nodes-base.noOp',
  'n8n-nodes-base.wait',
  'n8n-nodes-base.start',
  'n8n-nodes-base.manualTrigger',
];

export const ERROR_CODES = {
  UNAUTHORIZED:
    'Mibo rejected the API key. It does not exist or has been revoked. Keys created before you verified your email are revoked at verification. Create a new key in Mibo and update the credential. This is not the n8n API key.',
  API_KEY_EXPIRED:
    'The Mibo API key has expired. Create a new key in Mibo and update the credential.',
  VALIDATION_ERROR: 'The request body failed validation.',
  PLATFORM_NOT_FOUND: {
    withRestrictions:
      'The API key is restricted to specific agents. Verify that the agentId matches one of the allowed agents.',
    withoutRestrictions:
      'Could not determine the target agent. Send an agentId in the body, or restrict the API key to a single agent.',
  },
  AUTH_ERROR: 'Internal error while validating the API key. Contact support.',
  INTERNAL_SERVER_ERROR: 'Unexpected server error. Contact support if it persists.',
  PAYLOAD_TOO_LARGE:
    'The trace data is too large to send. Try reducing the number of target nodes or filtering nodes with large outputs (files, images, etc.).',
} as const;
