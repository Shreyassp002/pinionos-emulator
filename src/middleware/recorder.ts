import { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_FILE = path.resolve(process.cwd(), 'pinion-requests.jsonl');

let recording = false;
let stream: fs.WriteStream | null = null;

export function isRecording(): boolean {
  return recording;
}

export function startRecording(): void {
  if (recording) return;
  stream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });
  recording = true;
}

export function stopRecording(): void {
  recording = false;
  if (stream) {
    stream.end();
    stream = null;
  }
}

/**
 * Middleware that records every request/response pair to a JSONL file.
 * Must be mounted early in the middleware chain (after express.json()).
 */
export function recorderMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!recording) {
      next();
      return;
    }

    // Skip health/OPTIONS
    if (req.path === '/health' || req.path === '/' || req.method === 'OPTIONS') {
      next();
      return;
    }

    let responseBody: unknown;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      responseBody = body;
      return originalJson(body);
    }) as Response['json'];

    res.on('finish', () => {
      if (!stream) return;
      const entry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        requestBody: req.body ?? null,
        responseStatus: res.statusCode,
        responseBody: responseBody ?? null,
      };
      stream.write(JSON.stringify(entry) + '\n');
    });

    next();
  };
}
