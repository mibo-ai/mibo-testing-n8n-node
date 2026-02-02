# n8n-nodes-mibo-testing

n8n community node for **Mibo Testing** - a platform for semantic and procedural testing of AI workflows.

## Features

- **Capture Workflow Traces**: Automatically collect execution data from your n8n workflows
- **Send to Mibo Testing**: Securely transmit traces to Mibo Testing servers for analysis
- **Customizable Metadata**: Add custom JSON metadata to your traces
- **PII Scrubbing**: Redact sensitive information locally before sending traces
- **Platform Integration**: Link traces to specific platforms in your Mibo Testing account

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

1. Create a new credential of type **Mibo Testing API**
2. Enter your **API Key** (found in Mibo Testing Dashboard > Settings > API Keys)
3. Optionally, change the **Server URL** if using a self-hosted instance

### Node Setup

1. Add the **Mibo Testing** node at the end of your workflow (or wherever you want to capture the trace)
2. Configure the following:
   - **Platform ID**: Your platform identifier from Mibo Testing
   - **Clean PII**: Enable this to redact sensitive information locally

#### Advanced Options

- **Custom Metadata**: JSON object with additional context (JSON format)
- **Custom Server URL**: Override the credential's server URL
- **Timeout**: Maximum wait time for server response

## Usage Example

### Basic Setup

```
[Trigger] → [Your Nodes] → [Mibo Testing]
```

The Mibo Testing node acts as a **passthrough** - it captures the trace and forwards the data unchanged to any connected nodes.

### With Custom Metadata

Configure the node with:
- Platform ID: `plt_your_platform_id`
- Options > Custom Metadata:
  ```json
  {
    "environment": "production",
    "version": "2.1.0",
    "feature": "user-onboarding"
  }
  ```

## Trace Data Structure

The trace sent to Mibo Testing includes:

```typescript
{
  workflowId: string;
  workflowName: string;
  executionId: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'error';
  platformId: string;
  metadata: object;
  inputData: object[];
  outputData: object[];
}
```

---

## Development

### Prerequisites

- Node.js >= 20.0.0
- npm
- Docker (optional, for Docker-based development)

### Setup

```bash
git clone https://github.com/mibo-testing/n8n-nodes-mibo-testing.git
cd n8n-nodes-mibo-testing
npm install
```

### Development Options

There are two ways to develop: **local** (faster iteration) or **Docker** (more isolated).

#### Option 1: Local Development (Recommended)

Requires n8n installed globally:

```bash
# 1. Install n8n globally (one time)
npm install -g n8n

# 2. Build and link the node
npm run dev:link

# 3. Link to your n8n installation (one time)
cd ~/.n8n && npm link n8n-nodes-mibo-testing

# 4. Start development mode
npm run dev
```

This will:
- Build the project
- Watch for file changes in `nodes/` and `credentials/`
- Automatically rebuild and restart n8n on changes

Open http://localhost:5678 to access n8n.

#### Option 2: Docker Development

No global n8n installation needed:

```bash
npm run dev:docker
```

This will:
- Build the project
- Start n8n in a Docker container
- Watch for file changes and rebuild automatically
- Mount `dist/` directly (reload workflow in n8n to see changes)

Open http://localhost:5678 to access n8n.

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript to `dist/` |
| `npm run dev` | Local development with hot reload |
| `npm run dev:docker` | Docker development with hot reload |
| `npm run dev:link` | Build and npm link for local n8n |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run docker:build` | Build production Docker image |

### Makefile Shortcuts

```bash
make help        # Show all commands
make dev         # Same as npm run dev
make dev-docker  # Same as npm run dev:docker
make build       # Same as npm run build
make lint        # Same as npm run lint
make clean       # Remove dist/ and node_modules/
```

### Project Structure

```
├── nodes/
│   └── MiboTesting/
│       ├── MiboTesting.node.ts    # Main node implementation
│       └── mibo-testing.svg       # Node icon
├── credentials/
│   └── MiboTestingApi.credentials.ts
├── scripts/
│   ├── dev.mjs                    # Local dev script
│   ├── dev-docker.mjs             # Docker dev script
│   └── copy-icons.mjs             # Icon copy utility
├── dist/                          # Compiled output (generated)
├── docker-compose.dev.yml         # Docker development config
├── Dockerfile                     # Production image (Railway)
└── Makefile                       # Convenience commands
```

---

## License

GNU GPL v3
