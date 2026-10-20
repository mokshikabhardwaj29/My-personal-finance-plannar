import fs from 'fs';
import path from 'path';

const STORAGE_ROOT = path.resolve(process.cwd(), '.storage');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export class ObjectStorage {
  constructor() {
    this.ensureDirs();
  }

  private ensureDirs() {
    try {
      if (!fs.existsSync(STORAGE_ROOT)) {
        fs.mkdirSync(STORAGE_ROOT, { recursive: true });
      }
      const uploadsDir = path.join(STORAGE_ROOT, 'uploads');
      const driveInboxDir = path.join(STORAGE_ROOT, 'drive-inbox');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      if (!fs.existsSync(driveInboxDir)) fs.mkdirSync(driveInboxDir, { recursive: true });
    } catch (err) {
      console.error('Error ensuring storage directories:', err);
    }
  }

  public sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  public storeFile(objectKey: string, buffer: Buffer): { size: number; objectKey: string } {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File exceeds maximum size of 20 MB (actual: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
    }

    const fullPath = path.join(STORAGE_ROOT, objectKey);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, buffer);
    return {
      size: buffer.length,
      objectKey,
    };
  }

  public readFile(objectKey: string): Buffer | null {
    const fullPath = path.join(STORAGE_ROOT, objectKey);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  }

  public deleteFile(objectKey: string): boolean {
    const fullPath = path.join(STORAGE_ROOT, objectKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  public wipeAllFiles(): void {
    if (fs.existsSync(STORAGE_ROOT)) {
      try {
        fs.rmSync(STORAGE_ROOT, { recursive: true, force: true });
      } catch (err) {
        console.error('Error wiping storage root:', err);
      }
    }
    this.ensureDirs();
  }
}

export const storage = new ObjectStorage();
