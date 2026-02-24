#!/usr/bin/env node

/**
 * VibeZone v2 - Claude Code Hook Script
 *
 * This script is called by Claude Code hooks on various events.
 * It reads JSON from stdin, maps the event type, and POSTs it
 * to the VibeZone dashboard server for real-time visualization.
 *
 * Also writes events to ~/.vibezone/data/events.jsonl as backup.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Event type mapping from Claude Code hook names to our types
const EVENT_TYPE_MAP = {
  PreToolUse: 'pre_tool_use',
  PostToolUse: 'post_tool_use',
  Stop: 'stop',
  SubagentStop: 'subagent_stop',
  SessionStart: 'session_start',
  SessionEnd: 'session_end',
  UserPromptSubmit: 'user_prompt_submit',
  Notification: 'notification',
  PreCompact: 'pre_compact',
};

/**
 * Read all data from stdin as a string.
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);

    // Timeout after 5 seconds - don't hang Claude Code
    setTimeout(() => resolve(chunks.join('')), 5000);
  });
}

/**
 * Get the server port from the port file.
 */
function getServerPort() {
  const portFile = path.join(os.homedir(), '.vibezone', 'data', 'server.port');
  try {
    const content = fs.readFileSync(portFile, 'utf8').trim();
    const port = parseInt(content, 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

/**
 * POST event data to the local VibeZone server.
 */
function postEvent(port, event) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(event);

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/hook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 3000,
      },
      (res) => {
        res.resume(); // Drain response
        resolve(res.statusCode);
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Append event to the backup JSONL file.
 */
function backupEvent(event) {
  const dataDir = path.join(os.homedir(), '.vibezone', 'data');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(
      path.join(dataDir, 'events.jsonl'),
      JSON.stringify(event) + '\n',
      'utf8'
    );
  } catch {
    // Silently fail - don't disrupt Claude Code
  }
}

/**
 * Generate a unique event ID from timestamp and session ID.
 */
function generateEventId(sessionId) {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${sessionId || 'unknown'}-${rand}`;
}

async function main() {
  try {
    const rawInput = await readStdin();

    if (!rawInput || !rawInput.trim()) {
      process.exit(0);
    }

    let inputData;
    try {
      inputData = JSON.parse(rawInput);
    } catch {
      // Invalid JSON, ignore
      process.exit(0);
    }

    // Map the event type
    const hookType = inputData.type || inputData.event_type || '';
    const mappedType = EVENT_TYPE_MAP[hookType] || hookType.toLowerCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '');

    // Extract session ID from environment or input
    const sessionId = inputData.session_id || process.env.CLAUDE_SESSION_ID || 'unknown';

    // Build the event object
    const event = {
      id: generateEventId(sessionId),
      type: mappedType || 'unknown',
      sessionId,
      timestamp: Date.now(),
      data: inputData,
    };

    // Always backup to JSONL
    backupEvent(event);

    // Try to POST to the dashboard server
    const port = getServerPort();
    if (port) {
      try {
        await postEvent(port, event);
      } catch {
        // Server not running or unreachable - that's OK
      }
    }
  } catch {
    // Never crash Claude Code - exit cleanly on any error
  }

  process.exit(0);
}

main();
