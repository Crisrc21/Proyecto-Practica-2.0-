import { execFileSync } from "node:child_process";
import { removeNextCache } from "./remove-next-cache.mjs";

if (process.platform === "win32") {
  execFileSync("node", ["scripts/free-port-3000.mjs"], { stdio: "inherit" });
}

await removeNextCache();
