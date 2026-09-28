import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DB_BACKUP_BASE64 } from './db-seed-fallback';

function getDatabaseUrl(): string {
  const isVercel = !!process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
  
  if (isVercel) {
    const tmpDir = process.platform === 'win32' ? os.tmpdir() : '/tmp';
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}

    const tmpDbPath = path.join(tmpDir, 'kaijao.db');
    try {
      let needsInit = true;
      if (fs.existsSync(tmpDbPath)) {
        const stat = fs.statSync(tmpDbPath);
        if (stat.size > 1000) {
          needsInit = false;
        }
      }
      
      if (needsInit) {
        const repoDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
        if (fs.existsSync(repoDbPath) && fs.statSync(repoDbPath).size > 1000) {
          fs.copyFileSync(repoDbPath, tmpDbPath);
        } else if (DB_BACKUP_BASE64) {
          fs.writeFileSync(tmpDbPath, Buffer.from(DB_BACKUP_BASE64, 'base64'));
        }
      }
    } catch (e) {
      console.error('Error preparing tmp database, attempting fallback write:', e);
      try {
        if (DB_BACKUP_BASE64) {
          fs.writeFileSync(tmpDbPath, Buffer.from(DB_BACKUP_BASE64, 'base64'));
        }
      } catch (err2) {
        console.error('Fatal fallback write failed:', err2);
      }
    }
    const url = 'file:' + tmpDbPath;
    process.env.DATABASE_URL = url;
    return url;
  }

  // Local development
  const localDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  if (!fs.existsSync(localDbPath) && DB_BACKUP_BASE64) {
    try {
      const dir = path.dirname(localDbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(localDbPath, Buffer.from(DB_BACKUP_BASE64, 'base64'));
    } catch {}
  }
  const localUrl = 'file:' + localDbPath;
  process.env.DATABASE_URL = localUrl;
  return localUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

