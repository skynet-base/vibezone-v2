import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, basename, dirname } from 'path';
import { homedir } from 'os';
import { execFileSync } from 'child_process';
import { ProjectEntry, AutocompleteResult } from '../../shared/types';

const isWindows = process.platform === 'win32';

export class ProjectsManager {
  private configDir: string;
  private configFile: string;
  private projects: ProjectEntry[] = [];

  constructor() {
    this.configDir = resolve(homedir(), '.vibezone');
    this.configFile = join(this.configDir, 'projects.json');
    this.load();
  }

  getProjects(): ProjectEntry[] {
    return [...this.projects].sort((a, b) => b.lastUsed - a.lastUsed);
  }

  addProject(path: string, name?: string): void {
    const absPath = resolve(path);
    const existing = this.projects.find(p => p.path === absPath);
    if (existing) {
      existing.lastUsed = Date.now();
      existing.useCount++;
      if (name) existing.name = name;
    } else {
      this.projects.push({
        path: absPath,
        name: name || basename(absPath),
        lastUsed: Date.now(),
        useCount: 1,
      });
    }
    this.save();
  }

  removeProject(path: string): void {
    const absPath = resolve(path);
    this.projects = this.projects.filter(p => p.path !== absPath);
    this.save();
  }

  autocomplete(partial: string, limit: number = 15): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];
    const seen = new Set<string>();

    // Normalize partial path
    let normalizedPartial = partial;
    if (partial.startsWith('~')) {
      normalizedPartial = resolve(homedir(), partial.slice(1) || '.');
    }

    // Normalize Windows backslashes to forward slashes
    normalizedPartial = normalizedPartial.replace(/\\/g, '/');

    const isBrowsing = partial.endsWith('/') || partial.endsWith('\\') || partial === '~';
    const isPathLike = partial.startsWith('/') || partial.startsWith('~') || partial.startsWith('.')
      || (isWindows && /^[a-zA-Z]:[/\\]?/.test(partial));

    // 1. Filesystem results when path-like input
    if (isPathLike) {
      try {
        const fsResults = this.filesystemAutocomplete(normalizedPartial);
        for (const item of fsResults) {
          if (!seen.has(item.path)) {
            results.push(item);
            seen.add(item.path);
          }
        }
      } catch {
        // Ignore filesystem errors
      }
    }

    // 2. Known projects matching
    const lowerPartial = partial.toLowerCase();
    const projectResults: AutocompleteResult[] = [];
    for (const project of this.projects) {
      if (project.path.toLowerCase().includes(lowerPartial) ||
          project.name.toLowerCase().includes(lowerPartial)) {
        if (!seen.has(project.path)) {
          projectResults.push({
            path: project.path,
            name: project.name,
            isDirectory: true,
            isProject: true,
          });
          seen.add(project.path);
        }
      }
    }

    if (isBrowsing) {
      results.push(...projectResults);
    } else {
      // Not browsing: known projects first
      const knownPaths = new Set(this.projects.map(p => p.path));
      const fsOnly = results.filter(r => !knownPaths.has(r.path));
      results.length = 0;
      results.push(...projectResults, ...fsOnly);
    }

    return results.slice(0, limit);
  }

  getWindowsDrives(): string[] {
    if (!isWindows) return [];
    try {
      const output = execFileSync('wmic', ['logicaldisk', 'get', 'name'], {
        encoding: 'utf-8',
        timeout: 3000,
      });
      const drives = output.split('\n')
        .map(line => line.trim())
        .filter(line => /^[A-Z]:$/.test(line))
        .map(drive => drive + '/');
      return drives;
    } catch {
      // Fallback: check common drives
      const common = ['C:/', 'D:/', 'E:/', 'F:/'];
      return common.filter(d => existsSync(d));
    }
  }

  private filesystemAutocomplete(partial: string): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];
    const normalizedPath = partial.replace(/\\/g, '/');

    // Windows drive root with no further path (e.g. "C:" or "C:/")
    if (isWindows && /^[a-zA-Z]:[/\\]?$/.test(partial)) {
      const drivePath = partial.slice(0, 2) + '/';
      return this.listDirectories(drivePath);
    }

    if (existsSync(normalizedPath)) {
      try {
        if (statSync(normalizedPath).isDirectory()) {
          return this.listDirectories(normalizedPath);
        }
      } catch {
        // Not accessible
      }
    }

    // Partial path - complete the last segment
    const dir = dirname(normalizedPath);
    const prefix = basename(normalizedPath).toLowerCase();

    if (existsSync(dir)) {
      try {
        if (statSync(dir).isDirectory()) {
          const entries = readdirSync(dir);
          for (const entry of entries) {
            if (entry.startsWith('.') && !prefix.startsWith('.')) continue;
            if (entry.toLowerCase().startsWith(prefix)) {
              const fullPath = join(dir, entry).replace(/\\/g, '/');
              try {
                if (statSync(fullPath).isDirectory()) {
                  results.push({
                    path: fullPath,
                    name: entry,
                    isDirectory: true,
                    isProject: false,
                  });
                }
              } catch {
                // Skip inaccessible
              }
            }
          }
        }
      } catch {
        // Can't read directory
      }
    }

    return results;
  }

  private listDirectories(dirPath: string): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];
    try {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const fullPath = join(dirPath, entry).replace(/\\/g, '/');
        try {
          if (statSync(fullPath).isDirectory()) {
            results.push({
              path: fullPath,
              name: entry,
              isDirectory: true,
              isProject: false,
            });
          }
        } catch {
          // Skip inaccessible entries
        }
      }
    } catch {
      // Can't read directory
    }
    return results;
  }

  private load(): void {
    if (!existsSync(this.configFile)) {
      this.projects = [];
      return;
    }
    try {
      const content = readFileSync(this.configFile, 'utf-8');
      const data = JSON.parse(content);
      this.projects = data.projects || [];
    } catch {
      this.projects = [];
    }
  }

  private save(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    writeFileSync(this.configFile, JSON.stringify({ projects: this.projects }, null, 2));
  }
}
