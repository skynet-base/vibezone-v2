import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { HookEvent, HookEventType } from '../../shared/types';

const isWindows = process.platform === 'win32';

type HookEventCallback = (event: HookEvent) => void;

interface HookStatus {
  installed: boolean;
  running: boolean;
  port: number | null;
}

export class HookManager {
  private server: Server | null = null;
  private port: number | null = null;
  private onEvent: HookEventCallback | null = null;
  private sessionMap: Map<string, string> = new Map(); // claude session_id -> our session id

  private readonly vibeDir = resolve(homedir(), '.vibezone');
  private readonly hooksDir = resolve(this.vibeDir, 'hooks');
  private readonly dataDir = resolve(this.vibeDir, 'data');
  private readonly portFile = resolve(this.dataDir, 'server.port');

  setEventHandler(handler: HookEventCallback): void {
    this.onEvent = handler;
  }

  linkSession(claudeSessionId: string, managedSessionId: string): void {
    this.sessionMap.set(claudeSessionId, managedSessionId);
  }

  unlinkSession(claudeSessionId: string): void {
    this.sessionMap.delete(claudeSessionId);
  }

  async setup(): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure directories exist
      for (const dir of [this.vibeDir, this.hooksDir, this.dataDir]) {
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      }

      // Write hook script
      this.writeHookScript();

      // Start HTTP server
      await this.startServer();

      // Register hooks in Claude settings
      this.registerInClaudeSettings();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async uninstall(): Promise<void> {
    this.stopServer();
    this.unregisterFromClaudeSettings();

    // Clean up port file
    if (existsSync(this.portFile)) {
      try { unlinkSync(this.portFile); } catch {}
    }
  }

  checkStatus(): HookStatus {
    return {
      installed: this.isHookInstalled(),
      running: this.server !== null && this.server.listening,
      port: this.port,
    };
  }

  private writeHookScript(): void {
    const scriptName = isWindows ? 'vibezone-hook.ps1' : 'vibezone-hook.sh';
    const scriptPath = join(this.hooksDir, scriptName);

    if (isWindows) {
      // PowerShell hook script
      const script = `# VibeZone Hook Script - sends events to local HTTP server
$portFile = "$env:USERPROFILE\\.vibezone\\data\\server.port"
if (-not (Test-Path $portFile)) { exit 0 }
$port = Get-Content $portFile -Raw
$port = $port.Trim()
$input_data = [Console]::In.ReadToEnd()
try {
  $body = @{
    event_type = $env:CLAUDE_HOOK_EVENT_TYPE
    session_id = $env:CLAUDE_SESSION_ID
    input = $input_data
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  } | ConvertTo-Json -Depth 10
  Invoke-RestMethod -Uri "http://127.0.0.1:$port/hook" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 2 | Out-Null
} catch {
  # Silently fail - don't block Claude
}
`;
      writeFileSync(scriptPath, script, 'utf-8');
    } else {
      const script = `#!/bin/bash
# VibeZone Hook Script - sends events to local HTTP server
PORT_FILE="$HOME/.vibezone/data/server.port"
[ ! -f "$PORT_FILE" ] && exit 0
PORT=$(cat "$PORT_FILE" | tr -d '\\n')
INPUT=$(cat)
EVENT_TYPE="$CLAUDE_HOOK_EVENT_TYPE"
SESSION_ID="$CLAUDE_SESSION_ID"
TIMESTAMP=$(date +%s%3N)
BODY=$(jq -n --arg et "$EVENT_TYPE" --arg sid "$SESSION_ID" --arg inp "$INPUT" --arg ts "$TIMESTAMP" \\
  '{event_type: $et, session_id: $sid, input: $inp, timestamp: ($ts|tonumber)}')
curl -s -X POST "http://127.0.0.1:$PORT/hook" -H "Content-Type: application/json" -d "$BODY" --max-time 2 || true
`;
      writeFileSync(scriptPath, script, { mode: 0o755 });
    }
  }

  private registerInClaudeSettings(): void {
    const claudeSettingsPath = join(homedir(), '.claude', 'settings.json');
    const claudeDir = join(homedir(), '.claude');

    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    let settings: any = {};
    if (existsSync(claudeSettingsPath)) {
      try {
        settings = JSON.parse(readFileSync(claudeSettingsPath, 'utf-8'));
      } catch {
        settings = {};
      }
    }

    if (!settings.hooks) {
      settings.hooks = {};
    }

    const scriptName = isWindows ? 'vibezone-hook.ps1' : 'vibezone-hook.sh';
    const scriptPath = join(this.hooksDir, scriptName);
    const command = isWindows
      ? `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`
      : scriptPath;

    const hookTypes: string[] = [
      'PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop',
      'Notification', 'PreCompact',
    ];

    for (const hookType of hookTypes) {
      if (!settings.hooks[hookType]) {
        settings.hooks[hookType] = [];
      }
      // Remove existing vibezone hooks
      settings.hooks[hookType] = settings.hooks[hookType].filter(
        (h: any) => !h.matcher || h.matcher !== 'vibezone'
      );
      // Add our hook
      settings.hooks[hookType].push({
        matcher: 'vibezone',
        hooks: [{ type: 'command', command }],
      });
    }

    writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));
  }

  private unregisterFromClaudeSettings(): void {
    const claudeSettingsPath = join(homedir(), '.claude', 'settings.json');
    if (!existsSync(claudeSettingsPath)) return;

    try {
      const settings = JSON.parse(readFileSync(claudeSettingsPath, 'utf-8'));
      if (!settings.hooks) return;

      for (const hookType of Object.keys(settings.hooks)) {
        if (Array.isArray(settings.hooks[hookType])) {
          settings.hooks[hookType] = settings.hooks[hookType].filter(
            (h: any) => h.matcher !== 'vibezone'
          );
        }
      }

      writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2));
    } catch {
      // Can't modify settings
    }
  }

  private isHookInstalled(): boolean {
    const claudeSettingsPath = join(homedir(), '.claude', 'settings.json');
    if (!existsSync(claudeSettingsPath)) return false;

    try {
      const settings = JSON.parse(readFileSync(claudeSettingsPath, 'utf-8'));
      if (!settings.hooks) return false;
      for (const hookType of Object.keys(settings.hooks)) {
        if (Array.isArray(settings.hooks[hookType])) {
          if (settings.hooks[hookType].some((h: any) => h.matcher === 'vibezone')) {
            return true;
          }
        }
      }
    } catch {
      // Can't read
    }
    return false;
  }

  private async startServer(): Promise<void> {
    if (this.server?.listening) return;

    return new Promise((resolve, reject) => {
      const MAX_BODY_SIZE = 256 * 1024; // 256KB max request body
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        if (req.method === 'POST' && req.url === '/hook') {
          let body = '';
          let bodySize = 0;
          req.on('data', (chunk) => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY_SIZE) {
              res.writeHead(413);
              res.end('{"error":"payload too large"}');
              req.destroy();
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            if (bodySize > MAX_BODY_SIZE) return;
            try {
              const data = JSON.parse(body);
              this.handleHookEvent(data);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end('{"ok":true}');
            } catch {
              res.writeHead(400);
              res.end('{"error":"invalid json"}');
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      this.server.on('error', reject);

      // Listen on random port on loopback
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          // Write port file
          if (!existsSync(this.dataDir)) {
            mkdirSync(this.dataDir, { recursive: true });
          }
          writeFileSync(this.portFile, String(this.port));
        }
        resolve();
      });
    });
  }

  private stopServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.port = null;
    }
  }

  private handleHookEvent(data: any): void {
    const eventTypeMap: Record<string, HookEventType> = {
      PreToolUse: 'pre_tool_use',
      PostToolUse: 'post_tool_use',
      Stop: 'stop',
      SubagentStop: 'subagent_stop',
      Notification: 'notification',
      PreCompact: 'pre_compact',
    };

    const claudeSessionId = data.session_id || '';
    const managedSessionId = this.sessionMap.get(claudeSessionId) || claudeSessionId;

    const event: HookEvent = {
      id: randomUUID(),
      type: eventTypeMap[data.event_type] || data.event_type,
      sessionId: managedSessionId,
      timestamp: data.timestamp || Date.now(),
      data: data.input ? this.tryParseJson(data.input) : undefined,
    };

    if (this.onEvent) {
      this.onEvent(event);
    }
  }

  private tryParseJson(input: string): Record<string, unknown> | undefined {
    try {
      const parsed = JSON.parse(input);
      return typeof parsed === 'object' ? parsed : { value: parsed };
    } catch {
      return input ? { raw: input } : undefined;
    }
  }
}
