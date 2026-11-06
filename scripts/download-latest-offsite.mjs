#!/usr/bin/env node
// Unduh backup offsite terbaru dari R2, dekripsi, lalu cetak path dump.
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";

const PASS_FILE = "/home/ryukomik/.config/ryukomik-backup/passphrase";

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

const env = loadEnv();
const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const bucket = env.R2_BUCKET_NAME || "ryukomik-translate";

const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "backups/social/" }));
const items = (list.Contents || [])
  .filter((o) => o.Key && o.Key.endsWith(".enc"))
  .sort((a, b) => String(b.Key).localeCompare(String(a.Key)));
if (!items.length) {
  console.error("tidak ada backup offsite");
  process.exit(1);
}

const key = items[0].Key;
const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
const encPath = "/tmp/offsite-latest.enc";
const dumpPath = "/tmp/offsite-latest.dump";
writeFileSync(encPath, Buffer.from(await res.Body.transformToByteArray()));

execFileSync("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-salt", "-in", encPath, "-out", dumpPath, "-pass", `file:${PASS_FILE}`], { stdio: "pipe" });

// Validasi arsip benar-benar bisa dibaca.
execFileSync("pg_restore", ["--list", dumpPath], { stdio: "pipe" });

console.log(JSON.stringify({ key, bytes: items[0].Size || 0, dumpPath }));
