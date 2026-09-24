import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const env = { ...process.env, BASE_PATH: "/my-words/" };
function run(script, args, environment = env) {
  const result = spawnSync(process.execPath, [resolve(script), ...args], {
    stdio: "inherit",
    env: environment,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}
let status = run("node_modules/vite/bin/vite.js", ["build"]);
if (!status) status = run("node_modules/@playwright/test/cli.js", ["test"]);
// Leave the default local preview ready for root hosting even after a failed test.
const restored = run("node_modules/vite/bin/vite.js", ["build"], {
  ...process.env,
  BASE_PATH: "/",
});
process.exitCode = status || restored;
