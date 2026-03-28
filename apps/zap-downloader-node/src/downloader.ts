import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';
import axios from 'axios';

export async function downloadFile(url: string, outputPath: string, expectedHash?: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  console.log(`Downloading ${url}...`);
  
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    timeout: 300000,
  });
  
  await pipeline(response.data, fs.createWriteStream(outputPath));
  
  console.log(`Downloaded to ${outputPath}`);
  
  if (expectedHash) {
    await validateHash(outputPath, expectedHash);
  }
}

export async function validateHash(filePath: string, expectedHash: string): Promise<void> {
  const hash = await calculateHash(filePath);
  if (hash !== expectedHash.toLowerCase()) {
    throw new Error(`Hash mismatch! Expected: ${expectedHash}, Got: ${hash}`);
  }
  console.log(`Hash validation passed: ${hash}`);
}

export async function calculateHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
