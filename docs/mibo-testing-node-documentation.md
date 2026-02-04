# Mibo Testing Node Documentation

This document explains how the MiboTesting n8n node works and the different modes for capturing workflow execution data.

## Overview

The MiboTesting node captures execution data from your n8n workflow and sends it to the Mibo Testing API for analysis, testing, and quality monitoring. It supports two modes of operation:

1. **Get Workflow Mode** (Recommended) - Automatically discovers and captures nodes
2. **Manual Node Names Mode** - Manually specify which nodes to capture

---

## Mode Comparison

| Feature | Get Workflow Mode | Manual Node Names Mode |
|---------|-------------------|----------------------|
| Node Discovery | Automatic | Manual |
| Node Types | Included | Not included |
| Payload Size | Optimized (smaller) | Larger |
| Setup Effort | Lower | Higher |
| Filtering Options | Preset filters + Custom | Only custom |
| Workflow Definition | Excluded | Included in input |

---

## Get Workflow Mode (Recommended)

### How It Works

1. Connect an n8n "Get Workflow" node before the MiboTesting node
2. MiboTesting reads the workflow definition from the input
3. Based on your filter settings, it identifies which nodes to capture
4. It captures execution data from those nodes with their n8n types
5. Sends an **optimized trace** to the API

### Setup

```
[Get Workflow] → [MiboTesting]
```

1. Add a "Get Workflow" node and configure it to get the current workflow
2. Connect it to the MiboTesting node
3. Enable "Use Get Workflow Node" toggle
4. Select a node filter preset or use custom

### Node Filter Presets

| Preset | Description |
|--------|-------------|
| **All Nodes** | Captures data from every node (excluding sticky notes and MiboTesting itself) |
| **AI Nodes Only** | Nodes with "AI" in their name |
| **HTTP/Webhook Only** | HTTP Request and Webhook nodes only |
| **Exclude Utility Nodes** | Excludes Set, If, Merge, Switch |
| **Custom** | Specify exact node names |

### Automatically Excluded Nodes

These nodes are always filtered out:
- **Sticky Notes** - UI-only, no execution data
- **MiboTesting** - The node itself (prevents infinite loops)

### Optimized Trace Format

```json
{
  "status": "success",
  "data": {
    "Webhook": {
      "output": { "body": {...}, "headers": {...} },
      "type": "n8n-nodes-base.webhook",
      "status": "success"
    },
    "AI Agent": {
      "output": { "response": "..." },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "status": "success"
    }
  },
  "metadata": {
    "workflow_id": "abc123",
    "workflow_name": "My Workflow",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "platformId": "550e8400-..."
}
```

**Key Benefits:**
- Node types included (enables filtering by type on the server)
- Flat structure (easy to extract specific node outputs)
- Single items are unwrapped (no `[{ data }]` when there's only one item)
- No workflow definition bloat

---

## Manual Node Names Mode

### How It Works

1. You manually list the names of nodes you want to capture
2. MiboTesting finds those nodes in the execution context
3. Captures their output data
4. Sends a **legacy trace** to the API

### Setup

1. Add MiboTesting node anywhere in your workflow
2. Leave "Use Get Workflow Node" disabled
3. Enter node names separated by commas: `Webhook, HTTP Request, AI Agent`

### When to Use This Mode

- When you can't use Get Workflow node
- When you need to capture data from specific known nodes
- For backwards compatibility with existing integrations

### Legacy Trace Format

```json
{
  "data": {
    "input": [{ "nodes": [...], "connections": {...} }],
    "nodes": [
      { "nodeName": "Webhook", "items": [{ ... }] },
      { "nodeName": "AI Agent", "items": [{ ... }] }
    ]
  },
  "externalMetadata": { "workflowId": "abc123" },
  "metadata": {
    "workflowId": "abc123",
    "workflowName": "My Workflow",
    "timestamp": "..."
  },
  "platformId": "...",
  "externalId": "..."
}
```

**Characteristics:**
- Node types NOT included
- Items always wrapped in array
- May include full workflow definition in input
- Larger payload size

---

## Request ID Correlation

The MiboTesting node automatically searches for `x-request-id` in the execution data. This ID is used to correlate traces with n8n executions for active testing.

### Auto-Detection Order

1. Manual `Request ID` parameter (if provided)
2. Headers in input data
3. Webhook node data (when using Get Workflow mode)

### Setting Request ID Manually

Use an expression to extract from Webhook headers:
```
{{ $("Webhook").item.json.headers["x-request-id"] }}
```

---

## Metadata Options

Add custom metadata to your traces:

| Field | Description |
|-------|-------------|
| Environment | e.g., "production", "staging" |
| Version | Your workflow/app version |
| Additional Fields | JSON object with custom key-value pairs |

---

## Size Comparison

Example workflow with 5 nodes:

| Format | Typical Size | Reduction |
|--------|-------------|-----------|
| Manual Mode | ~50-100 KB | - |
| Get Workflow Mode | ~5-15 KB | 80-90% |

The optimized format removes:
- Full workflow definitions
- Node positions, colors, IDs
- Connection metadata
- Credential details

---

## API Compatibility

The Mibo Testing API handles both formats automatically.

### Format Detection

```javascript
function isOptimizedFormat(payload) {
  // V2 has data as object with node names as keys
  // V1 has data.nodes as array
  return payload.data && !Array.isArray(payload.data.nodes);
}
```

---

## Extracting Final Output (for Test Runner)

### From Optimized Format

```javascript
// Find AI nodes by type pattern
const aiNodes = Object.entries(trace.data).filter(([_, node]) =>
  node.type.includes('langchain') || node.type.includes('openai')
);

// Get the last AI node's output
const finalOutput = aiNodes[aiNodes.length - 1][1].output;
```

### From Legacy Format

```javascript
const nodes = trace.data.nodes;
const lastNode = nodes[nodes.length - 1];
const finalOutput = lastNode.items[0]; // Usually single item
```

---

## Node Type Examples

Common n8n node types you might see:

| Type | Description |
|------|-------------|
| `n8n-nodes-base.webhook` | Webhook trigger |
| `n8n-nodes-base.httpRequest` | HTTP Request |
| `n8n-nodes-base.set` | Set node |
| `n8n-nodes-base.if` | IF conditional |
| `@n8n/n8n-nodes-langchain.agent` | AI Agent (LangChain) |
| `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` | Google Gemini model |
| `@n8n/n8n-nodes-langchain.toolCode` | Code tool for agents |

---

## Best Practices

1. **Use Get Workflow Mode** when possible for smaller payloads and type information
2. **Filter nodes** to only capture what you need for testing
3. **Set Request ID** for active testing scenarios
4. **Monitor payload size** warnings in the output
5. **Use expressions** to dynamically set Platform ID if needed