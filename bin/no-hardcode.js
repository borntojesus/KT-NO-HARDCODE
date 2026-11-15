#!/usr/bin/env node
/**
 * no-hardcode [paths...]
 * Runs only the no-hardcode rules (ESLint + stylelint), independent of the
 * project's own lint configs. Exits 1 on any finding.
 */
import { run } from "../src/cli.js";

run(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`no-hardcode: ${err?.stack ?? err}`);
    process.exitCode = 2;
  },
);
