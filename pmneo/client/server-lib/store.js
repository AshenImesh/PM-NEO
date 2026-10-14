import fs from 'fs';
import path from 'path';

// Storage with two backends, chosen at runtime:
//
// 1. Vercel KV (Redis) — when KV_REST_API_URL + KV_REST_API_TOKEN are set
//    (Vercel Storage integration injects these automatically). The whole
//    workspace lives under one key, so the document model stays identical
//    to the local file version.
// 2. Local JSON file — everywhere else (localhost dev). Auto-created.

const EMPTY = { projects: [], tasks: [], columns: [], people: [] };
const KV_KEY = 'pmneo:workspace';
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), 'data.json');

// Upstash Redis (Vercel Marketplace Redis integration) injects
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN automatically.
// The legacy Vercel KV pair is accepted too — same REST protocol.
function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

let redis = null;
async function getRedis() {
  if (redis) return redis;
  const cfg = redisConfig();
  if (!cfg) return null;
  const { Redis } = await import('@upstash/redis');
  redis = new Redis(cfg);
  return redis;
}

async function readKV() {
  const client = await getRedis();
  const data = await client.get(KV_KEY);
  if (!data) {
    await client.set(KV_KEY, EMPTY);
    return structuredClone(EMPTY);
  }
  return withBackfilledKeys(typeof data === 'string' ? JSON.parse(data) : data);
}

function withBackfilledKeys(data) {
  const out = { ...EMPTY, ...data };
  for (const key of Object.keys(EMPTY)) {
    if (!Array.isArray(out[key])) out[key] = [];
  }
  return out;
}

function readFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY, null, 2));
    return structuredClone(EMPTY);
  }
  const data = withBackfilledKeys(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
  return data;
}

export async function readData() {
  if (redisConfig()) return readKV();
  return readFile();
}

export async function writeData(data) {
  if (redisConfig()) {
    const client = await getRedis();
    await client.set(KV_KEY, data);
    return;
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function storageInfo() {
  return redisConfig() ? 'upstash-redis' : 'local-file';
}
