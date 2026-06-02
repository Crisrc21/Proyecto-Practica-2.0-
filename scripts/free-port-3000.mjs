import { execFileSync } from "node:child_process";

const PORT = 3000;

if (process.platform !== "win32") {
  process.exit(0);
}

const powershell = `
$connections = Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue
foreach ($connection in $connections) {
  $pidToStop = $connection.OwningProcess
  if ($pidToStop) {
    Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
  }
}
`;

try {
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", powershell],
    { stdio: "ignore" }
  );
} catch {
  process.exit(0);
}
