import type { Express } from "express";
import express from "express";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { storageRead } from "../storage";

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
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
