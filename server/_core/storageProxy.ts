import type { Express } from "express";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { storageRead } from "../storage";

const LOCAL_STORAGE_FALLBACKS = new Map<string, string>([
  ["The_False_Wall_09c297b9.mp3", "The_False_Wall.mp3"],
  ["ending_poster_d88e314f.png", "ending_poster.png"],
  ["bg_welcome_2345c7fc.png", "map_bg_wall.png"],
  ["bg_elevator_371b48ce.png", "map_bg_wall.png"],
  ["bg_reception_c9b3d319.png", "map_bg_wall.png"],
  ["bg_graffiti_356c1a20.png", "lev2_graffiti_new.png"],
  ["bg_office_26395507.png", "map_bg_wall.png"],
  ["lev1_indoor_5391e6c6.png", "map_bg_wall.png"],
  ["lev2_graffiti_new_6ee0a04f.png", "lev2_graffiti_new.png"],
  ["lev3_checkin_25badea1.png", "map_bg_wall.png"],
  ["lev4_elevator_089a80c3.webp", "map_bg_wall.png"],
  ["lev5_door_3551cd73.png", "map_bg_wall.png"],
]);

function pipeStorageBody(body: unknown, res: express.Response): void {
  if (!body) {
    res.status(404).end("File not found");
    return;
  }

  if (typeof (body as { pipe?: unknown }).pipe === "function") {
    (body as NodeJS.ReadableStream).pipe(res);
    return;
  }

  if (body instanceof ReadableStream) {
    Readable.fromWeb(body as unknown as NodeReadableStream<Uint8Array>).pipe(res);
    return;
  }

  Readable.from(body as Iterable<Uint8Array>).pipe(res);
}

function getSafeRange(rangeHeader: string | undefined): string | undefined {
  if (!rangeHeader) return undefined;
  return /^bytes=\d+-\d*$/.test(rangeHeader) ? rangeHeader : undefined;
}

function getContentType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function getLocalFallbackPath(key: string): string | null {
  const normalizedKey = key.replace(/^\/+/, "");
  const mappedName = LOCAL_STORAGE_FALLBACKS.get(normalizedKey);
  const fileName = mappedName ?? (normalizedKey.startsWith("videos/") ? path.basename(normalizedKey) : null);
  if (!fileName || fileName.includes("..")) return null;
  const filePath = path.join(process.cwd(), "assets", fileName);
  return fs.existsSync(filePath) ? filePath : null;
}

function getByteRange(range: string | undefined, totalSize: number) {
  if (!range) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : totalSize - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= totalSize) {
    return null;
  }
  return { start, end: Math.min(end, totalSize - 1) };
}

function pipeLocalFallback(
  key: string,
  range: string | undefined,
  res: express.Response,
): boolean {
  const filePath = getLocalFallbackPath(key);
  if (!filePath) return false;

  const totalSize = fs.statSync(filePath).size;
  const byteRange = getByteRange(range, totalSize);
  res.setHeader("Content-Type", getContentType(key));
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Accept-Ranges", "bytes");

  if (byteRange) {
    res.status(206);
    res.setHeader("Content-Range", `bytes ${byteRange.start}-${byteRange.end}/${totalSize}`);
    res.setHeader("Content-Length", String(byteRange.end - byteRange.start + 1));
    fs.createReadStream(filePath, byteRange).pipe(res);
    return true;
  }

  res.setHeader("Content-Length", String(totalSize));
  fs.createReadStream(filePath).pipe(res);
  return true;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || key.includes("..")) {
      res.status(400).send("Invalid storage key");
      return;
    }

    try {
      const file = await storageRead(key, getSafeRange(req.headers.range));
      res.setHeader(
        "Content-Type",
        file.contentType || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Accept-Ranges", "bytes");
      if (file.contentRange) {
        res.status(206);
        res.setHeader("Content-Range", file.contentRange);
      }
      if (file.contentLength) {
        res.setHeader("Content-Length", String(file.contentLength));
      }
      pipeStorageBody(file.body, res);
    } catch (err) {
      if (pipeLocalFallback(key, getSafeRange(req.headers.range), res)) {
        return;
      }
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
