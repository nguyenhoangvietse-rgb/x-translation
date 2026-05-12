import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { R2_ACCESS_KEY, R2_SECRET_KEY, CF_ACCOUNT_ID, R2_BUCKET = "n-storage" } =
  process.env;

function assertR2Config() {
  if (!R2_ACCESS_KEY || !R2_SECRET_KEY || !CF_ACCOUNT_ID) {
    throw new Error(
      "Missing R2 config. Set R2_ACCESS_KEY, R2_SECRET_KEY, and CF_ACCOUNT_ID.",
    );
  }
}

export const r2Bucket = R2_BUCKET;

let client: S3Client | null = null;
function getR2Client() {
  if (client) {
    return client;
  }
  assertR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY!,
      secretAccessKey: R2_SECRET_KEY!,
    },
  });
  return client;
}

export async function createUploadUrl(jobId: string, expiresIn = 900) {
  const key = `input/${jobId}/novel.txt`;
  const command = new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    ContentType: "text/plain; charset=utf-8",
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn });
  return { key, uploadUrl };
}

export async function readObjectAsText(key: string): Promise<string | null> {
  try {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: key,
      }),
    );
    return (await response.Body?.transformToString("utf-8")) ?? null;
  } catch {
    return null;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: r2Bucket,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
