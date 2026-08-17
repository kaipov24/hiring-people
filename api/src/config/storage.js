import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, "../../uploads");

const storageDriver = process.env.STORAGE_DRIVER || "local";
const r2Bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || "";

const s3Client =
  storageDriver === "r2"
    ? new S3Client({
        region: process.env.R2_REGION || process.env.S3_REGION || "auto",
        endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY
        },
        forcePathStyle: true
      })
    : null;

const extensionFrom = (filename) => path.extname(filename).toLowerCase();

const localFilename = (userId, originalName) => {
  return `${userId}-${Date.now()}-${randomUUID()}${extensionFrom(originalName)}`;
};

const objectKey = (userId, originalName) => {
  return `resumes/${userId}/${Date.now()}-${randomUUID()}${extensionFrom(originalName)}`;
};

const assertR2Configured = () => {
  const missing = [];

  if (!process.env.R2_ENDPOINT && !process.env.S3_ENDPOINT) missing.push("R2_ENDPOINT");
  if (!r2Bucket) missing.push("R2_BUCKET");
  if (!process.env.R2_ACCESS_KEY_ID && !process.env.S3_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!process.env.R2_SECRET_ACCESS_KEY && !process.env.S3_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");

  if (missing.length > 0) {
    throw new Error(`Cloudflare R2 storage is not configured: ${missing.join(", ")}`);
  }
};

export const saveCvFile = async ({ userId, file }) => {
  if (storageDriver === "r2") {
    assertR2Configured();

    const key = objectKey(userId, file.originalname);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    return {
      storageDriver: "r2",
      storageKey: key,
      filename: key,
      bucket: r2Bucket
    };
  }

  await fs.mkdir(uploadRoot, { recursive: true });

  const filename = localFilename(userId, file.originalname);
  const filePath = path.join(uploadRoot, filename);

  await fs.writeFile(filePath, file.buffer);

  return {
    storageDriver: "local",
    storageKey: filename,
    filename,
    bucket: ""
  };
};

export const deleteCvFile = async (cv) => {
  if (!cv?.filename && !cv?.storageKey) return;

  const driver = cv.storageDriver || "local";
  const key = cv.storageKey || cv.filename;

  try {
    if (driver === "r2") {
      assertR2Configured();
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: cv.bucket || r2Bucket,
          Key: key
        })
      );
      return;
    }

    await fs.unlink(path.resolve(uploadRoot, key));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`Could not delete old CV file: ${error.message}`);
    }
  }
};

export const streamCvFile = async (cv) => {
  const driver = cv.storageDriver || "local";
  const key = cv.storageKey || cv.filename;

  if (driver === "r2") {
    assertR2Configured();
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: cv.bucket || r2Bucket,
        Key: key
      })
    );

    if (typeof result.Body?.pipe === "function") {
      return result.Body;
    }

    if (typeof result.Body?.transformToWebStream === "function") {
      return Readable.fromWeb(result.Body.transformToWebStream());
    }

    throw new Error("Cloudflare R2 returned an unsupported response stream");
  }

  return createReadStream(path.resolve(uploadRoot, key));
};

export const getStorageDriver = () => storageDriver;
