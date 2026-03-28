import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const [, , pageUrl, slug = "smoke"] = process.argv;

if (!pageUrl) {
  throw new Error("Usage: node scripts/smoke-page.mjs <url> <slug>");
}

const outputDir = path.resolve(".smoke");

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100, deviceScaleFactor: 1 },
});

page.on("pageerror", (error) => {
  console.error("PAGE ERROR:", error.stack || error.toString());
});

await page.goto(pageUrl, { waitUntil: "networkidle2" });
await fs.mkdir(outputDir, { recursive: true });

const screenshotPath = path.join(outputDir, `${slug}.png`);
await page.screenshot({ path: screenshotPath, fullPage: true });

console.log(`Smoke screenshot saved to ${screenshotPath}`);

await browser.close();
