/**
 * تولید آیکون‌های PWA وُدّا از لوگوی برداری (public/vodda-logo.svg).
 * اجرا: cd frontend && bun scripts/generate-icons.mjs
 *
 * آیکون «any» — پس‌زمینهٔ کرم برند + نشان سبز زیتونی در مرکز.
 * آیکون «maskable» — نشان کوچک‌تر تا در ناحیهٔ امن (۸۰٪ مرکزی) همهٔ لانچرها سالم بماند.
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const svg = readFileSync(path.join(root, "../public/vodda-logo.svg"));
const outDir = path.join(root, "../public/icons");
mkdirSync(outDir, { recursive: true });

const BRAND_BACKGROUND = "#faf8f2"; // sand50 — پس‌زمینهٔ برند

async function renderMark(targetHeight) {
  return sharp(svg, { density: 600 }).resize(null, targetHeight).png().toBuffer();
}

/** مربع کامل با نشان مرکزی — پارامتر scale نسبت ارتفاع نشان به ضلع است. */
async function makeSquare({ size, scale, dest, background = BRAND_BACKGROUND }) {
  const mark = await renderMark(Math.round(size * scale));
  const meta = await sharp(mark).metadata();
  const top = Math.round((size - meta.height) / 2);
  const left = Math.round((size - meta.width) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: mark, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log("icon:", path.basename(dest), `${size}x${size}`);
}

// آیکون‌های استاندارد — نشان ۶۴٪ برای نفس‌کشیدن حاشیه‌ها
await makeSquare({ size: 192, scale: 0.64, dest: path.join(outDir, "icon-192.png") });
await makeSquare({ size: 512, scale: 0.64, dest: path.join(outDir, "icon-512.png") });

// maskable — نشان ۵۲٪ تا داخل دایرهٔ امن همهٔ لانچرها (۸۰٪ مرکزی) بماند
await makeSquare({ size: 512, scale: 0.52, dest: path.join(outDir, "icon-maskable-512.png") });

// iOS — apple-touch-icon؛ گوشه‌ها خود iOS گرد می‌کند، پس مربع کامل
await makeSquare({ size: 180, scale: 0.64, dest: path.join(outDir, "apple-touch-icon.png") });

// favicon — نشان بدون پس‌زمینه برای تب مرورگر
await sharp(svg, { density: 600 }).resize(48, null).png().toFile(path.join(outDir, "favicon-48.png"));
console.log("icon: favicon-48.png 48px (شفاف)");
