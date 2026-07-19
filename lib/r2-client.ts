import { nanoid } from "nanoid";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

async function hmacSha256(key: CryptoKey, data: string): Promise<ArrayBuffer> {
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
}

async function getSigningKey(secretKey: string, date: string, region: string, service: string) {
  const kDate = await hmacSha256(
    await crypto.subtle.importKey("raw", new TextEncoder().encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    date
  );
  const kRegion = await hmacSha256(
    await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    region
  );
  const kService = await hmacSha256(
    await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    service
  );
  return crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function sign(
  method: string,
  path: string,
  headers: Record<string, string>,
  payload: ArrayBuffer | null,
  date: string,
  timestamp: string
): Promise<Record<string, string>> {
  const region = "auto";
  const service = "s3";

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}`).join("\n") + "\n";

  const payloadHash = payload
    ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", payload)))
        .map(b => b.toString(16).padStart(2, "0")).join("")
    : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest))))
      .map(b => b.toString(16).padStart(2, "0")).join(""),
  ].join("\n");

  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY!, date, region, service);
  const signature = Array.from(new Uint8Array(await hmacSha256(signingKey, stringToSign)))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export async function r2PutObject(key: string, body: ArrayBuffer | Buffer, contentType: string): Promise<void> {
  const now = new Date();
  const date = now.toISOString().split("T")[0].replace(/-/g, "");
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const headers: Record<string, string> = {
    host: new URL(R2_ENDPOINT).hostname,
    "x-amz-date": timestamp,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "content-type": contentType,
  };

  const signedHeaders = await sign("PUT", `/${R2_BUCKET}/${key}`, headers, null, date, timestamp);
  signedHeaders["x-amz-content-sha256"] = "UNSIGNED-PAYLOAD";

  const bytes = body instanceof Buffer ? new Uint8Array(body) : new Uint8Array(body);
  const arrayBuffer = bytes.buffer;

  const res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, {
    method: "PUT",
    headers: signedHeaders,
    body: arrayBuffer,
  });

  if (!res.ok) {
    throw new Error(`R2 PUT failed: ${res.status} ${await res.text()}`);
  }
}

export async function r2GetPresignedUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
  const now = new Date();
  const date = now.toISOString().split("T")[0].replace(/-/g, "");
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const expiresAt = Math.floor(now.getTime() / 1000) + expiresIn;

  const region = "auto";
  const service = "s3";

  const canonicalQueryString = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(R2_ACCESS_KEY_ID! + "/" + date + "/" + region + "/" + service + "/aws4_request")}`,
    `X-Amz-Date=${timestamp}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ].sort().join("&");

  const canonicalRequest = [
    "PUT",
    `/${R2_BUCKET}/${key}`,
    canonicalQueryString,
    `host:${new URL(R2_ENDPOINT).hostname}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest))))
      .map(b => b.toString(16).padStart(2, "0")).join(""),
  ].join("\n");

  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY!, date, region, service);
  const signature = Array.from(new Uint8Array(await hmacSha256(signingKey, stringToSign)))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  return `${R2_ENDPOINT}/${R2_BUCKET}/${key}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
