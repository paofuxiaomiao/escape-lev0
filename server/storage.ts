import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "./_core/env";

type OssConfig = {
  region: string;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
};

let ossClient: S3Client | null = null;

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function getOssConfig(): OssConfig | null {
  const {
    ossRegion,
    ossEndpoint,
    ossBucket,
    ossAccessKeyId,
    ossAccessKeySecret,
  } = ENV;

  if (
    !ossRegion ||
    !ossEndpoint ||
    !ossBucket ||
    !ossAccessKeyId ||
    !ossAccessKeySecret
  ) {
    return null;
  }

  return {
    region: ossRegion,
    endpoint: ossEndpoint,
    bucket: ossBucket,
    accessKeyId: ossAccessKeyId,
    accessKeySecret: ossAccessKeySecret,
  };
}

function getOssClient(config: OssConfig): S3Client {
  if (!ossClient) {
    ossClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.accessKeySecret,
      },
    });
  }
  return ossClient;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function buildStorageUrl(key: string): string {
  return `/manus-storage/${key}`;
}

async function storagePutToOss(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const config = getOssConfig();
  if (!config) throw new Error("OSS storage is not configured");

  const body = typeof data === "string" ? Buffer.from(data) : data;
  await getOssClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return { key, url: buildStorageUrl(key) };
}

async function storagePutToForge(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();

  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: buildStorageUrl(key) };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (getOssConfig()) {
    return storagePutToOss(key, data, contentType);
  }
  return storagePutToForge(key, data, contentType);
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: buildStorageUrl(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  if (getOssConfig()) {
    return buildStorageUrl(relKey);
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}

export async function storageRead(relKey: string): Promise<{
  key: string;
  body: unknown;
  contentType?: string;
  contentLength?: number;
}> {
  const key = normalizeKey(relKey);
  const config = getOssConfig();
  if (!config) {
    const url = await storageGetSignedUrl(key);
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`Storage read failed (${response.status} ${response.statusText})`);
    }
    return {
      key,
      body: response.body,
      contentType: response.headers.get("content-type") || "application/octet-stream",
      contentLength: Number(response.headers.get("content-length")) || undefined,
    };
  }

  const object = await getOssClient(config).send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  return {
    key,
    body: object.Body,
    contentType: object.ContentType || "application/octet-stream",
    contentLength: object.ContentLength,
  };
}
