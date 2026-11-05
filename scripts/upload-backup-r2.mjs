#!/usr/bin/env node
// Upload backup sosial ke R2 dalam bentuk TERENKRIPSI (AES-256-CBC, salted).
// Bucket R2 yang tersedia bersifat publik (CDN cover), jadi file plaintext
// TIDAK PERNAH di-upload — hanya blob .enc. Tanpa passphrase di
// ~/.config/ryukomik-backup/passphrase (mode 600) isinya tidak terbaca.
//
// Pakai: node --env-file=.env.local scripts/upload-backup-r2.mjs <file> <key>
// Output JSON: { key, bytes, retained } — ditulis juga ke
// /home/ryukomik/backups/ryukomik-social/.last-offsite.json oleh pemanggil.
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const PASS_FILE = "/home/ryukomik/.config/ryukomik-backup/passphrase";
const RETENTION_DAYS = 14;

function loadEnv() {
  const env = {};
  for (const line of readFileSync("/home/ryukomik/ryukomik/.env.local", "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !line.trim().startsWith("#")) {
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const [file, key] = process.argv.slice(2);
if (!file || !key) {
  console.error("pakai: upload-backup-r2.mjs <file> <r2-key>");
  process.exit(1);
}

const env = loadEnv();
const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const bucket = env.R2_BUCKET_NAME || "ryukomik-translate";

const dir = mkdtempSync(join(tmpdir(), "bkp-"));
const enc = join(dir, "blob.enc");
try {
  execFileSync("openssl", ["enc", "-aes-256-cbc", "-pbkdf2", "-salt", "-in", file, "-out", enc, "-pass", `file:${PASS_FILE}`], { stdio: "pipe" });
  const body = readFileSync(enc);
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/octet-stream" }));

  // Retensi offsite: hapus objek backups/ yang lebih dari 14 hari.
  const cutoff = Date.now() - RETENTION_DAYS * 86400 * 1000;
  let retained = 0;
  let token;
  const oldKeys = [];
  do {
    const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "backups/", ContinuationToken: token }));
    for (const obj of list.Contents || []) {
      if (obj.LastModified && obj.LastModified.getTime() < cutoff) oldKeys.push(obj.Key);
      else retained += 1;
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  if (oldKeys.length) {
    await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: oldKeys.map((k) => ({ Key: k })) } }));
  }

  console.log(JSON.stringify({ key, bytes: body.length, retained, pruned: oldKeys.length }));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
