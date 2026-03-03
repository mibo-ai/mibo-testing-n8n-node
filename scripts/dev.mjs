#!/usr/bin/env node
/**
 * Development script for local development
 *
 * Prerequisites:
 *   pnpm add -g n8n
 *   pnpm run dev:link  (runs: pnpm run build && pnpm link)
 *   cd ~/.n8n && pnpm link n8n-nodes-mibo-testing
 *
 * This script:
 *   1. Builds the project
 *   2. Watches for source changes
 *   3. Rebuilds on change
 *   4. Restarts n8n automatically
 */

import { spawn, execSync } from 'node:child_process';
import { watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

const log = logger.child({ name: 'dev' });
const n8nLog = logger.child({ name: 'n8n' });

let n8nProcess = null;
let isBuilding = false;
let pendingRestart = false;

function build() {
  if (isBuilding) {
    pendingRestart = true;
    return false;
  }

  isBuilding = true;
  log.info('Building...');

  try {
    execSync('pnpm run build', { cwd: ROOT, stdio: 'pipe' });
    log.info('Build complete');
    isBuilding = false;
    return true;
  } catch (error) {
    log.error({ err: error.stdout?.toString() || error.message }, 'Build failed');
    isBuilding = false;
    return false;
  }
}

function startN8n() {
  if (n8nProcess) {
    log.info('Stopping n8n...');
    n8nProcess.kill('SIGTERM');
    n8nProcess = null;
  }

  log.info('Starting n8n...');

  n8nProcess = spawn('n8n', ['start'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      N8N_LOG_LEVEL: 'info',
      N8N_DIAGNOSTICS_ENABLED: 'false',
    },
  });

  n8nProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) n8nLog.info(line);
  });

  n8nProcess.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (line) n8nLog.warn(line);
  });

  n8nProcess.on('close', (code) => {
    if (code !== null && code !== 0) {
      log.warn({ code }, 'n8n exited');
    }
  });

  n8nProcess.on('error', (err) => {
    log.error({ err }, 'Failed to start n8n');
    log.warn('Make sure n8n is installed globally: pnpm add -g n8n');
  });
}

function restart() {
  if (build()) {
    startN8n();
    log.info({ url: 'http://localhost:5678' }, 'n8n is running');
  }

  if (pendingRestart) {
    pendingRestart = false;
    setTimeout(restart, 100);
  }
}

function setupWatcher() {
  const dirsToWatch = [
    join(ROOT, 'nodes'),
    join(ROOT, 'credentials'),
  ];

  let debounceTimer = null;

  const onChange = (eventType, filename) => {
    if (!filename || !filename.endsWith('.ts')) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      log.info({ file: filename }, 'Change detected');
      restart();
    }, 300);
  };

  for (const dir of dirsToWatch) {
    try {
      watch(dir, { recursive: true }, onChange);
      log.info({ dir }, 'Watching directory');
    } catch (err) {
      log.warn({ dir, err: err.message }, 'Could not watch directory');
    }
  }
}

function cleanup() {
  log.info('Shutting down...');
  if (n8nProcess) {
    n8nProcess.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main
log.info('='.repeat(50));
log.info('Mibo Testing n8n Node - Local Dev');
log.info('='.repeat(50));
log.info('Prerequisites:');
log.info('  1. pnpm add -g n8n');
log.info('  2. pnpm run dev:link');
log.info('  3. cd ~/.n8n && pnpm link n8n-nodes-mibo-testing');
log.info('='.repeat(50));

if (build()) {
  setupWatcher();
  startN8n();
  log.info({ url: 'http://localhost:5678' }, 'n8n is running');
  log.info('Watching for changes... (Ctrl+C to stop)');
} else {
  log.error('Initial build failed. Fix errors and try again.');
  process.exit(1);
}