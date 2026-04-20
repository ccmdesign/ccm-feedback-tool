// Copy the Prisma rhel-openssl-3.0.x query engine into the Next.js standalone
// output after build. Next.js's file tracer resolves Prisma's native addon
// based on the build-host platform (darwin on the Netlify builder or local
// deploy), so the Linux `.so.node` needed at function runtime is not traced
// automatically — even when `binaryTargets` generated it on disk.
//
// Run from the repo root as a post-build step.

import { readdirSync, existsSync, copyFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const ENGINE_FILE = "libquery_engine-rhel-openssl-3.0.x.so.node";

function walk(dir, predicate, hits = []) {
  if (!existsSync(dir)) return hits;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(p, predicate, hits);
    else if (predicate(p, name)) hits.push(p);
  }
  return hits;
}

function walkDirs(dir, predicate, hits = []) {
  if (!existsSync(dir)) return hits;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      if (predicate(p, name)) hits.push(p);
      walkDirs(p, predicate, hits);
    }
  }
  return hits;
}

const sources = walk("node_modules", (_, name) => name === ENGINE_FILE);
if (sources.length === 0) {
  console.error(`[copy-prisma-rhel-engine] ${ENGINE_FILE} not found under node_modules/.`);
  console.error("Did `prisma generate` run with binaryTargets = [\"native\", \"rhel-openssl-3.0.x\"]?");
  process.exit(1);
}
const src = sources[0];

const targetDirs = walkDirs(
  "apps/demo/.next/standalone/node_modules",
  (p, name) => name === "client" && p.endsWith(join(".prisma", "client")),
);

if (targetDirs.length === 0) {
  console.error("[copy-prisma-rhel-engine] No .prisma/client dir under apps/demo/.next/standalone.");
  console.error("Did the Next.js build produce a standalone output?");
  process.exit(1);
}

for (const dir of targetDirs) {
  const dest = join(dir, ENGINE_FILE);
  copyFileSync(src, dest);
  console.log(`[copy-prisma-rhel-engine] copied ${src} -> ${dest}`);
}
