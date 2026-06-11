import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "screenshots");
const BASE = "http://localhost:3000";

const PAGES = [
  { name: "1-dashboard",  url: `${BASE}/dashboard` },
  { name: "2-google-ads", url: `${BASE}/dashboard/connectors/google-ads` },
  { name: "3-meta-ads",   url: `${BASE}/dashboard/connectors/meta` },
  { name: "4-sync-jobs",  url: `${BASE}/dashboard/sync-jobs` },
];

async function main() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    // Send bypass header on every request in this context
    extraHTTPHeaders: {
      "x-dev-screenshot": "ultrametrics_dev_screenshot",
    },
  });

  const page = await context.newPage();

  for (const { name, url } of PAGES) {
    console.log(`Capturing ${name} …`);
    await page.goto(url, { waitUntil: "networkidle" });
    // Let Framer Motion animations settle
    await page.waitForTimeout(1800);
    const file = join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ✓  saved → ${file}`);
  }

  await browser.close();
  console.log("\nAll done. Screenshots in ./screenshots/");
}

main().catch((e) => { console.error(e); process.exit(1); });
