#!/usr/bin/env node
/**
 * Development script for Docker-based development.
 *
 * This script:
 *   1. Builds the project initially
 *   2. Starts n8n in Docker with the node mounted
 *   3. Watches for source changes
 *   4. Rebuilds on change (no container restart needed - volume mount)
 *
 * The key improvement: mounts ./dist directly, so changes are picked up
 * without restarting the container (just reload the workflow in n8n).
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

const log = logger.child({ name: 'dev-docker' });
const dockerLog = logger.child({ name: 'docker' });

let dockerProcess = null;
let isBuilding = false;
let pendingBuild = false;

function build() {
  if (isBuilding) {
    pendingBuild = true;
    return false;
  }

  isBuilding = true;
  log.info('Building...');

  try {
    execSync('pnpm run build', { cwd: ROOT, stdio: 'pipe' });
    log.info('Build complete - changes will be picked up by n8n');
    isBuilding = false;
    return true;
  } catch (error) {
    log.error({ err: error.stdout?.toString() || error.message }, 'Build failed');
    isBuilding = false;
    return false;
  }
}

function startDocker() {
  log.info('Starting Docker Compose...');
  try {
    execSync('docker compose -f docker-compose.dev.yml down', {
      cwd: ROOT,
      stdio: 'pipe',
    });
  } catch {
    // Ignore - might not be running
  }

  dockerProcess = spawn('docker', ['compose', '-f', 'docker-compose.dev.yml', 'up'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  dockerProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line) dockerLog.info(line);
  });

  dockerProcess.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (line && !line.includes('Attaching to')) {
      dockerLog.info(line);
    }
  });

  dockerProcess.on('close', (code) => {
    if (code !== null && code !== 0) {
      log.warn({ code }, 'Docker exited');
    }
  });

  dockerProcess.on('error', (err) => {
    log.error({ err }, 'Failed to start Docker');
  });
}

function setupWatcher() {
  const dirsToWatch = [
    join(ROOT, 'nodes'),
    join(ROOT, 'credentials'),
  ];

  let debounceTimer = null;

  const onChange = (eventType, filename) => {
    if (!filename || !filename.endsWith('.ts')) {
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      log.info({ file: filename }, 'Change detected');
      build();

      if (pendingBuild) {
        pendingBuild = false;
        setTimeout(() => build(), 100);
      }
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

  if (dockerProcess) {
    dockerProcess.kill('SIGTERM');
  }

  try {
    execSync('docker compose -f docker-compose.dev.yml down', {
      cwd: ROOT,
      stdio: 'pipe',
    });
  } catch {
    // Ignore
  }

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
log.info('='.repeat(50));
log.info('Mibo Testing n8n Node - Docker Dev');
log.info('='.repeat(50));
log.info('This mode mounts the dist folder directly.');
log.info('Changes are picked up without restarting the container.');
log.info('Just reload your workflow in n8n to see changes.');
log.info('='.repeat(50));
if (build()) {
  setupWatcher();
  startDocker();
  log.info({ url: 'http://localhost:5678' }, 'n8n is starting...');
  log.info('Watching for changes... (Ctrl+C to stop)');
} else {
  log.error('Initial build failed. Fix errors and try again.');
  process.exit(1);
}