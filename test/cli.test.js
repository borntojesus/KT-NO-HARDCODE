import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const bin = join(root, "bin/no-hardcode.js");
const run = (...args) => spawnSync(process.execPath, [bin, ...args], { cwd: root, encoding: "utf8" });

describe("cli", () => {
  it("fails on the bad fixture with file:line messages", () => {
    const r = run("fixtures/bad");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /Card\.tsx:\d+:\d+ .*no-hardcode\/no-arbitrary-tailwind/);
    assert.match(r.stdout, /Card\.tsx:\d+:\d+ .*no-hardcode\/no-color-literal/);
    assert.match(r.stdout, /Card\.tsx:\d+:\d+ .*no-hardcode\/no-raw-font-family/);
    assert.match(r.stdout, /card\.css:\d+:\d+ .*color-no-hex/);
    assert.match(r.stdout, /card\.css:\d+:\d+ .*color-named/);
    assert.match(r.stdout, /Hero\.astro:\d+:\d+ .*no-hardcode\/no-arbitrary-tailwind/);
    assert.match(r.stdout, /Hero\.astro:\d+:\d+ .*function-disallowed-list/);
  });

  it("passes on the good fixture (allow, ignore and token files respected)", () => {
    const r = run("fixtures/good");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /no-hardcode: ok/);
  });

  it("accepts single files", () => {
    assert.equal(run("fixtures/good/src/components/Card.tsx").status, 0);
    assert.equal(run("fixtures/bad/src/components/card.css").status, 1);
  });

  it("prints help", () => {
    const r = run("--help");
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage: no-hardcode/);
  });
});
