import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "coverage"]);
const CHECK_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const PATTERNS = [/console\.log/, /TODO|FIXME|HACK|XXX/];

const getExtension = (fileName) => {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex) : "";
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...(await walk(fullPath)));
      }
      continue;
    }

    if (fullPath !== join(ROOT, "scripts", "check-residuals.mjs") && CHECK_EXTENSIONS.has(getExtension(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
};

const files = await walk(ROOT);
const violations = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of PATTERNS) {
      if (pattern.test(line)) {
        violations.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    }
  });
}

if (violations.length > 0) {
  process.stderr.write(`Residual debug markers found:\n${violations.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("No residual debug markers found.\n");
