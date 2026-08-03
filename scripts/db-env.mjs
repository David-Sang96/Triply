import { existsSync } from "node:fs";

import { config } from "dotenv";

// Chooses which database the db:* scripts talk to.
//
// Default is `.env`, which holds the **dev** Neon branch. Pass `--prod` and it
// loads `.env.production` instead, which holds the production branch. Both
// files are gitignored (`.env.*`).
//
// The switch is a CLI flag rather than an environment variable on purpose. npm
// runs scripts through cmd.exe on Windows, where `VAR=value command` silently
// does nothing — a flag behaves the same on every machine. It also means the
// dangerous target is visible in shell history: you can see that you typed
// `db:migrate:prod` rather than wondering which database a bare `db:migrate`
// happened to hit.
//
// Returns a label so each script can announce where it is pointed. Printing the
// target is the point: the failure mode being designed against is running a
// migration against the wrong database without noticing.
export function loadDatabaseEnv() {
  const isProd = process.argv.includes("--prod");
  const file = isProd ? ".env.production" : ".env";

  if (!existsSync(file)) {
    throw new Error(
      `${file} not found. ` +
        (isProd
          ? "Create it with the production branch DATABASE_URL — see .env.example."
          : "Copy .env.example to .env and fill in the dev branch DATABASE_URL."),
    );
  }

  // `override: true` because dotenv defaults to leaving already-set variables
  // alone. Without it an exported DATABASE_URL in the shell silently wins over
  // the file, and the script still prints the label from the file — so
  // `db:check:prod` would report PRODUCTION while talking to whatever was
  // exported. The named file has to be authoritative or the whole scheme is
  // decorative.
  config({ path: file, override: true });

  if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL is not set in ${file}`);
  }

  // The label says which *file* was loaded, which is not proof of which branch
  // it points at — a wrong string in .env would still be labelled "dev". So
  // also return Neon's endpoint id, which differs per branch and is safe to
  // print (no password). Comparing it against the Neon console is what actually
  // confirms the target.
  return {
    isProd,
    file,
    label: isProd ? "PRODUCTION" : "dev",
    endpoint: endpointId(process.env.DATABASE_URL),
  };
}

// Pulls `ep-dawn-salad-aztkyd1o` out of
// postgresql://user:pass@ep-dawn-salad-aztkyd1o-pooler.c-3.region.aws.neon.tech/db
// Returns null rather than throwing: this is for a log line, and a connection
// string that does not parse is the connection attempt's problem to report.
function endpointId(url) {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^(ep-[a-z0-9-]+?)(-pooler)?\./);
    return match ? match[1] : host;
  } catch {
    return null;
  }
}
