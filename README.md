# n8n-nodes-mibo-testing

n8n community node for **Mibo Testing** - a platform for semantic and procedural testing of AI workflows.

## Features

- **Auto-detect Workflow Nodes**: Automatically discover all nodes in your workflow via the n8n API, or fall back to the "Get Workflow" node
- **Smart Node Filtering**: Filter captured nodes by preset (All, AI Only, HTTP/Webhook, Exclude Utility) or pick specific nodes
- **Optimized Trace Format**: Compact payloads with node type information for server-side AI auto-detection
- **Automatic Compression**: Payloads larger than 5MB are gzip-compressed before sending
- **Request ID Correlation**: Auto-detects `x-request-id` from webhook headers for active testing
- **Passthrough Design**: Captures traces transparently without modifying your workflow data

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes** in your n8n instance
2. Search for `n8n-nodes-mibo-testing`
3. Click **Install**

### Manual Installation

```bash
npm install n8n-nodes-mibo-testing
```

Then restart your n8n instance.

## Configuration

### Credentials

Create a new credential of type **Mibo Testing API** with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| **API Key** | Yes | Your Mibo Testing API key. Find it in your Mibo Testing dashboard under **Settings > API Keys**. |
| **n8n API Key** | No | Your n8n instance API key. Enables automatic workflow node detection without needing a separate "Get Workflow" node. To create one: open n8n, go to **Settings > API**, and click **Create an API Key**. The key only needs the **workflow:read** scope. |
| **n8n Base URL** | No | The URL where your n8n instance is running. Examples: `http://localhost:5678` for local setups, `https://your-n8n.example.com` for self-hosted, or your n8n Cloud URL. |

### Node Setup

Add the **Mibo Testing** node at the end of your workflow (or wherever you want to capture the trace).

#### Auto-detect Mode (Recommended)

Enable **Auto-detect Workflow Nodes** to automatically discover all nodes in your workflow.

- If you configured the **n8n API Key** and **n8n Base URL** in the credentials, it works automatically with no extra setup.
- If you didn't configure n8n API credentials, connect an n8n **"Get Workflow"** node before this one as a fallback.

```
Auto-detect with n8n API credentials:
[Trigger] --> [Your Nodes] --> [Mibo Testing]

Fallback without n8n API credentials:
[Trigger] --> [Your Nodes] --> [Get Workflow] --> [Mibo Testing]
```

**Node Filter** options when using Auto-detect:

| Filter | What it captures |
|--------|-----------------|
| All Nodes | Every node in the workflow (excluding internal/utility types) |
| AI Nodes Only | Only nodes with "AI" in their name |
| HTTP/Webhook Only | Only HTTP Request and Webhook nodes |
| Exclude Utility Nodes | Everything except Set, If, Merge, and Switch |
| Custom | You specify exact node names, separated by commas |

#### Manual Mode

Leave **Auto-detect Workflow Nodes** off and enter node names separated by commas in the **Target Nodes** field.

```
[Trigger] --> [Your Nodes] --> [Mibo Testing]
                                    ^
                        Target Nodes: "Webhook, AI Agent, HTTP Request"
```

### Other Parameters

| Parameter | Description |
|-----------|-------------|
| **Request ID** | The `x-request-id` for correlating this trace with test executions. Auto-detected from webhook headers if not provided. |
| **Platform ID** | Your platform UUID in Mibo Testing. If not provided, the API resolves it from your API key restrictions. |
| **Include Metadata** | Add environment, version, and custom fields to the trace. |

### Advanced Options

| Option | Default | Description |
|--------|---------|-------------|
| Timeout (Seconds) | 30 | Maximum time to wait for the Mibo Testing server to respond. |

## Output

The node passes through all input data unchanged, adding a `_miboTrace` object to each item:

```json
{
  "original_field": "preserved",
  "_miboTrace": {
    "sent": true,
    "traceId": "abc-123",
    "platformId": "550e8400-...",
    "requestId": "req-456",
    "timestamp": "2026-03-08T10:30:00.000Z",
    "nodesCollected": 3,
    "targetNodes": ["Webhook", "AI Agent", "HTTP Request"],
    "payloadSize": "12.5 KB"
  }
}
```

---

## Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Docker (optional, for Docker-based development)

### Setup

```bash
git clone https://github.com/mibo-testing/n8n-nodes-mibo-testing.git
cd n8n-nodes-mibo-testing
pnpm install
```

### Development Options

#### Option 1: Local Development (Recommended)

Requires n8n installed globally:

```bash
# Install n8n globally (one time)
pnpm add -g n8n

# Build and link the node
pnpm run dev:link

# Link to your n8n installation (one time)
cd ~/.n8n && npm link n8n-nodes-mibo-testing

# Start development mode (builds, watches, restarts n8n on changes)
pnpm run dev
```

Open http://localhost:5678 to access n8n.

#### Option 2: Docker Development

No global n8n installation needed:

```bash
pnpm run dev:docker
```

Builds the project, starts n8n in Docker, and watches for file changes. Reload your workflow in n8n to pick up changes.

Open http://localhost:5678 to access n8n.

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run dev` | Local development with hot reload |
| `pnpm run dev:docker` | Docker development with hot reload |
| `pnpm run dev:link` | Build and link for local n8n |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm run check` | Run Biome linter and formatter |
| `pnpm run check:fix` | Auto-fix linting and formatting issues |
| `pnpm run docker:build` | Build production Docker image |

### Makefile Shortcuts

```bash
make help         # Show all commands
make dev          # Same as pnpm run dev
make dev-docker   # Same as pnpm run dev:docker
make build        # Same as pnpm run build
make check        # Same as pnpm run check
make clean        # Remove dist/ and node_modules/
```

### Project Structure

```
├── nodes/MiboTesting/
│   ├── MiboTesting.node.ts       # Main node implementation
│   ├── builders.ts               # Trace payload builders
│   ├── constants.ts              # Configuration constants
│   ├── mibo-client.ts            # HTTP client for Mibo API
│   ├── types.ts                  # TypeScript interfaces
│   ├── utils.ts                  # Utility functions
│   └── mibo-testing.svg          # Node icon
├── credentials/
│   └── MiboTestingApi.credentials.ts
├── tests/
│   ├── node.test.ts              # Node execution tests
│   ├── builders.test.ts          # Payload builder tests
│   ├── mibo-client.test.ts       # HTTP client tests
│   └── utils.test.ts             # Utility function tests
├── scripts/
│   ├── dev.mjs                   # Local dev script
│   ├── dev-docker.mjs            # Docker dev script
│   └── copy-icons.mjs            # Icon copy utility
├── docs/                         # Internal documentation
├── dist/                         # Compiled output (generated)
├── docker-compose.dev.yml        # Docker development config
├── Dockerfile                    # Production Docker image
└── Makefile                      # Convenience commands
```

---

## License

[GPL-3.0-or-later](LICENSE)
