import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

const THEME = {
  background: '#050508',
  foreground: '#e8e8f0',
  cursor: '#00ccff',
  cursorAccent: '#050508',
  selectionBackground: '#00ccff44',
  selectionForeground: '#e8e8f0',
  black: '#050508',
  red: '#ff4444',
  green: '#00ff88',
  yellow: '#f59e0b',
  blue: '#00ccff',
  magenta: '#8b5cf6',
  cyan: '#00ccff',
  white: '#e8e8f0',
  brightBlack: '#5a5a78',
  brightRed: '#ff6666',
  brightGreen: '#33ffaa',
  brightYellow: '#ffb733',
  brightBlue: '#33ddff',
  brightMagenta: '#a78bfa',
  brightCyan: '#33ddff',
  brightWhite: '#ffffff',
};

interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  webglAddon: WebglAddon | null;
  element: HTMLElement | null;
  onDataDisposable: { dispose: () => void } | null;
  onResizeDisposable: { dispose: () => void } | null;
}

type InputHandler = (sessionId: string, data: string) => void;
type ResizeHandler = (sessionId: string, cols: number, rows: number) => void;

class TerminalManagerClass {
  private instances: Map<string, TerminalInstance> = new Map();
  private onInput: InputHandler | null = null;
  private onResize: ResizeHandler | null = null;

  setHandlers(onInput: InputHandler, onResize: ResizeHandler) {
    this.onInput = onInput;
    this.onResize = onResize;
  }

  create(sessionId: string): Terminal {
    if (this.instances.has(sessionId)) {
      return this.instances.get(sessionId)!.terminal;
    }

    const terminal = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    const instance: TerminalInstance = {
      terminal,
      fitAddon,
      webglAddon: null,
      element: null,
      onDataDisposable: null,
      onResizeDisposable: null,
    };

    this.instances.set(sessionId, instance);
    return terminal;
  }

  mount(sessionId: string, element: HTMLElement): void {
    const instance = this.instances.get(sessionId);
    if (!instance) return;

    // Already mounted to this element
    if (instance.element === element) {
      instance.fitAddon.fit();
      return;
    }

    // Open terminal in element
    instance.terminal.open(element);
    instance.element = element;

    // Try WebGL addon
    try {
      const webglAddon = new WebglAddon();
      instance.terminal.loadAddon(webglAddon);
      instance.webglAddon = webglAddon;
    } catch (e) {
      console.warn('WebGL addon failed to load, using canvas renderer');
    }

    // Fit to container
    requestAnimationFrame(() => {
      instance.fitAddon.fit();
    });

    // Setup input handler
    if (instance.onDataDisposable) {
      instance.onDataDisposable.dispose();
    }
    instance.onDataDisposable = instance.terminal.onData((data) => {
      this.onInput?.(sessionId, data);
    });

    // Resize handler - dispose previous to prevent leak
    if (instance.onResizeDisposable) {
      instance.onResizeDisposable.dispose();
    }
    instance.onResizeDisposable = instance.terminal.onResize(({ cols, rows }) => {
      this.onResize?.(sessionId, cols, rows);
    });
  }

  unmount(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance || !instance.element) return;

    // We don't dispose - we just detach from DOM to preserve scrollback
    instance.element = null;
  }

  write(sessionId: string, data: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance) return;
    instance.terminal.write(data);
  }

  fit(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance || !instance.element) return;
    try {
      instance.fitAddon.fit();
    } catch {
      // Element might not be visible
    }
  }

  fitAll(): void {
    for (const [sessionId] of this.instances) {
      this.fit(sessionId);
    }
  }

  destroy(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance) return;

    instance.onDataDisposable?.dispose();
    instance.onResizeDisposable?.dispose();
    instance.webglAddon?.dispose();
    instance.fitAddon.dispose();
    instance.terminal.dispose();
    this.instances.delete(sessionId);
  }

  getTerminal(sessionId: string): Terminal | null {
    return this.instances.get(sessionId)?.terminal ?? null;
  }

  focus(sessionId: string): void {
    const instance = this.instances.get(sessionId);
    if (!instance) return;
    instance.terminal.focus();
  }

  has(sessionId: string): boolean {
    return this.instances.has(sessionId);
  }
}

export const terminalManager = new TerminalManagerClass();
