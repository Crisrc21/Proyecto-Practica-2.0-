import { existsSync } from "node:fs";
import { rm, rename } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function removeWithRetries(path, attempts = 8) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rm(path, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 250
      });
      return true;
    } catch (error) {
      if (attempt === attempts) return false;
      await wait(250 * attempt);
    }
  }

  return false;
}

export async function removeNextCache() {
  const nextCachePath = resolve(process.cwd(), ".next");

  if (!existsSync(nextCachePath)) return;

  const removed = await removeWithRetries(nextCachePath);
  if (removed || !existsSync(nextCachePath)) return;

  const stalePath = resolve(
    dirname(nextCachePath),
    `${basename(nextCachePath)}-stale-${Date.now()}`
  );

  try {
    await rename(nextCachePath, stalePath);
    await removeWithRetries(stalePath, 4);
  } catch {
    console.warn(
      "No se pudo limpiar .next por bloqueo temporal de Windows/OneDrive. Cierra servidores abiertos si el arranque falla."
    );
  }
}
