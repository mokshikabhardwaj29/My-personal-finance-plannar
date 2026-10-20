/**
 * Cloudflare D1 and Cloudflare R2 Native Interfaces & Persistence Layer
 * Strictly adheres to Cloudflare Workers / Pages D1 (SQLite) and R2 (S3-compatible) specifications.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ============================================================================
// 1. Cloudflare D1 Interface Definitions
// ============================================================================

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
    last_row_id: number;
    changes: number;
  };
  error?: string;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1Result>;
}

// ============================================================================
// 2. Cloudflare R2 Interface Definitions
// ============================================================================

export interface R2ObjectMetadata {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    cacheControl?: string;
  };
  customMetadata?: Record<string, string>;
}

export interface R2Object extends R2ObjectMetadata {
  body: ReadableStream | Buffer;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface R2Bucket {
  head(key: string): Promise<R2ObjectMetadata | null>;
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Buffer,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    }
  ): Promise<R2ObjectMetadata>;
  delete(key: string | string[]): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    objects: R2ObjectMetadata[];
    truncated: boolean;
    cursor?: string;
  }>;
}

// ============================================================================
// 3. Local & Dev R2 Storage Driver (Mirrors Cloudflare R2 Behavior)
// ============================================================================

export class LocalR2Bucket implements R2Bucket {
  private baseDir: string;
  private readonly MAX_SIZE = 20 * 1024 * 1024; // 20 MB strictly enforced

  constructor(storageDir?: string) {
    this.baseDir = storageDir || path.resolve(process.cwd(), '.storage', 'r2');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/\.\./g, '');
    return path.join(this.baseDir, safeKey);
  }

  async head(key: string): Promise<R2ObjectMetadata | null> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    return {
      key,
      version: '1',
      size: stat.size,
      etag: crypto.createHash('md5').update(key + stat.mtimeMs).digest('hex'),
      httpEtag: `"${stat.size}"`,
      uploaded: stat.mtime,
    };
  }

  async get(key: string): Promise<R2Object | null> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const stat = fs.statSync(filePath);
    const etag = crypto.createHash('md5').update(buf).digest('hex');

    return {
      key,
      version: '1',
      size: buf.length,
      etag,
      httpEtag: `"${etag}"`,
      uploaded: stat.mtime,
      body: buf,
      async arrayBuffer() {
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      },
      async text() {
        return buf.toString('utf-8');
      },
      async json<T>() {
        return JSON.parse(buf.toString('utf-8')) as T;
      },
    };
  }

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Buffer,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }
  ): Promise<R2ObjectMetadata> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let buf: Buffer;
    if (Buffer.isBuffer(value)) {
      buf = value;
    } else if (typeof value === 'string') {
      buf = Buffer.from(value, 'utf-8');
    } else if (value instanceof ArrayBuffer) {
      buf = Buffer.from(value);
    } else if (ArrayBuffer.isView(value)) {
      buf = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    } else {
      throw new Error('Unsupported value type for local R2 storage');
    }

    if (buf.length > this.MAX_SIZE) {
      throw new Error(`File exceeds maximum size of 20MB (actual: ${(buf.length / (1024 * 1024)).toFixed(2)} MB)`);
    }

    fs.writeFileSync(filePath, buf);
    const stat = fs.statSync(filePath);
    const etag = crypto.createHash('md5').update(buf).digest('hex');

    return {
      key,
      version: '1',
      size: buf.length,
      etag,
      httpEtag: `"${etag}"`,
      uploaded: stat.mtime,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
    };
  }

  async delete(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      const filePath = this.getFilePath(k);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  async list(options?: { prefix?: string; limit?: number }): Promise<{
    objects: R2ObjectMetadata[];
    truncated: boolean;
  }> {
    const prefix = options?.prefix || '';
    const results: R2ObjectMetadata[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          const relKey = path.relative(this.baseDir, full).replace(/\\/g, '/');
          if (relKey.startsWith(prefix)) {
            const stat = fs.statSync(full);
            results.push({
              key: relKey,
              version: '1',
              size: stat.size,
              etag: crypto.createHash('md5').update(relKey + stat.mtimeMs).digest('hex'),
              httpEtag: `"${stat.size}"`,
              uploaded: stat.mtime,
            });
          }
        }
      }
    };

    walk(this.baseDir);
    return {
      objects: results.slice(0, options?.limit || 100),
      truncated: results.length > (options?.limit || 100),
    };
  }
}

export const r2Bucket: R2Bucket = new LocalR2Bucket();
