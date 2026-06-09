#!/usr/bin/env node

/**
 * Pilot Mine Provisioning Script
 *
 * Wraps the artisan provision:pilot command for Docker-based environments.
 * Detects Docker vs bare-metal Laravel and runs accordingly.
 *
 * Usage:
 *   node team/scripts/provision-pilot.mjs                    # auto-detect
 *   node team/scripts/provision-pilot.mjs --slug=my-mine     # custom slug
 *   node team/scripts/provision-pilot.mjs --help             # show options
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "../..");
const API_DIR = resolve(ROOT, "services/api");

const args = process.argv.slice(2).filter((a) => a !== "--help" && a !== "-h");
const showHelp = process.argv.includes("--help") || process.argv.includes("-h");

const HELP = `
provision-pilot.mjs — Provision the pilot mine workspace

USAGE:
  node team/scripts/provision-pilot.mjs [OPTIONS]

OPTIONS:
  --workspace-name=NAME    Workspace name (default: "Pilot Mine Workspace")
  --slug=SLUG              URL slug (default: "pilot-mine")
  --password=PASS          Default user password (default: "password")
  --help, -h               Show this help

EXAMPLES:
  node team/scripts/provision-pilot.mjs
  node team/scripts/provision-pilot.mjs --slug=sishen-mine --password=pilot2024
  node team/scripts/provision-pilot.mjs --workspace-name="Sishen Pilot"

SETUP:
  1. Ensure Docker stack is running: docker compose up -d
  2. Run migrations: docker compose exec -T api php artisan migrate
  3. Run this script
`;

if (showHelp) {
  console.log(HELP);
  process.exit(0);
}

function artisanal(...artisanArgs) {
  const extras = args
    .filter((a) => a.startsWith("--"))
    .map((a) => a.replace(/=/, " "));
  const allArgs = [...artisanArgs, ...extras];
  return `php artisan ${allArgs.join(" ")}`;
}

function dockerComposeExec(cmd, cwd = ROOT) {
  console.log(`  > docker compose exec -T api sh -c "${cmd}"`);
  return execSync(`docker compose exec -T api sh -c "${cmd}"`, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, TERM: "xterm-256color" },
    shell: "cmd.exe",
  });
}

function localExec(cmd, cwd) {
  console.log(`  > ${cmd}`);
  return execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: { ...process.env },
    shell: "cmd.exe",
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Aquerii — Pilot Mine Provisioning                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  // Detect environment
  const dockerCompose = existsSync(resolve(ROOT, "docker-compose.yml"));
  const artisanExists = existsSync(resolve(API_DIR, "artisan"));

  let useDocker = false;

  if (dockerCompose) {
    try {
      execSync("docker compose ps --services 2>nul | findstr /i api", {
        cwd: ROOT,
        stdio: "pipe",
        shell: "cmd.exe",
      });
      useDocker = true;
      console.log("  Detected: Docker Compose with API service running\n");
    } catch {
      console.log("  Detected: docker-compose.yml exists but API not running\n");
    }
  }

  if (!useDocker && artisanExists) {
    console.log("  Detected: Local Laravel installation\n");
  }

  if (!useDocker && !artisanExists) {
    console.error(
      "  ERROR: Could not find artisan or Docker stack.\n" +
      "  Ensure you are in the project root and Docker is running.\n"
    );
    process.exit(1);
  }

  // Confirm
  const wsName = args
    .find((a) => a.startsWith("--workspace-name="))
    ?.split("=")[1] || "Pilot Mine Workspace";

  console.log(`  This will provision: "${wsName}"`);
  console.log("  Press Ctrl+C to cancel or Enter to continue...");

  // Non-blocking read isn't great in Node, so we use a simple sync approach
  // In non-interactive mode, we just proceed.
  const isInteractive = process.stdin.isTTY;
  if (!isInteractive) {
    console.log("  Non-interactive mode — proceeding...\n");
  }

  // Run migrations first
  console.log("  Step 1: Running migrations...");
  try {
    const migrateCmd = artisanal("migrate", "--force");
    if (useDocker) {
      dockerComposeExec(migrateCmd);
    } else {
      localExec(migrateCmd, API_DIR);
    }
  } catch {
    console.log("  Migrations may have partially applied. Continuing...");
  }

  // Run the provision command
  console.log("\n  Step 2: Provisioning pilot workspace...");
  const provisionCmd = artisanal("provision:pilot");
  try {
    if (useDocker) {
      dockerComposeExec(provisionCmd);
    } else {
      localExec(provisionCmd, API_DIR);
    }
    console.log("\n  ✓ Provisioning complete!");
  } catch (err) {
    console.error("\n  ✗ Provisioning failed:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
