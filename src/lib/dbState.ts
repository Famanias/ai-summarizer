// src/lib/dbState.ts
let currentDbPath: string | null = null;

export function setDbPath(path: string) {
  currentDbPath = path;
}

export function getDbPath(): string | null {
  return currentDbPath;
}