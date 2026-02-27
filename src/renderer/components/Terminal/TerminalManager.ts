import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

const THEME = {
  background:    '#020205',
  foreground:    '#EEEEF8',
  black:         '#1A1A35',
  brightBlack:   '#3A3A5C',
  red:           '#FF3B5C',
  brightRed:     '#FF5577',
  green:         '#00FF88',
  brightGreen:   '#33FFAA',
  yellow:        '#F59E0B',
  brightYellow:  '#FFB800',
  blue:          '#4488FF',
  brightBlue:    '#60A5FA',
  magenta:       '#8B5CF6',
  brightMagenta: '#A78BFA',
  cyan:          '#00CCFF',
  brightCyan:    '#00F0FF',
  white:         '#C8C8E8',
  brightWhite:   '#EEEEF8',
  cursor:        '#00CCFF',
  cursorAccent:  '#020205',
  selectionBackground: 'rgba(0,204,255,0.2)',
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
