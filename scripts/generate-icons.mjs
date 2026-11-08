import sharp from "sharp";
import fs from "fs";
import path from "path";

const publicDir = path.resolve("./public");
const appDir = path.resolve("./app");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG Logo Shield with stylized eye/magnifier + checkmark in teal-to-blue gradient
const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
    <linearGradient id="innerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#0B1020" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background Base (dark navy circle for standalone app icon) -->
  <rect width="512" height="512" rx="112" fill="#0B1020" />

  <!-- Shield Base -->
  <g filter="url(#shadow)">
    <path d="M 256 64 C 360 64 416 96 416 96 C 416 260 340 376 256 432 C 172 376 96 260 96 96 C 96 96 152 64 256 64 Z"
          fill="url(#shieldGrad)" />
    <!-- Inner soft highlight -->
    <path d="M 256 72 C 350 72 404 102 404 102 C 404 252 334 362 256 416 C 178 362 108 252 108 102 C 108 102 162 72 256 72 Z"
          fill="url(#innerGlow)" opacity="0.6"/>
  </g>

  <!-- Central Stylized Eye / Shield Lens (Surface Navy) -->
  <path d="M 160 256 C 188 196 324 196 352 256 C 324 316 188 316 160 256 Z"
        fill="#121A2F" stroke="#ffffff" stroke-width="12" stroke-linejoin="round"/>

  <!-- Pupil / Iris Circle -->
  <circle cx="256" cy="256" r="44" fill="url(#shieldGrad)" />

  <!-- Verification Checkmark Inside Pupil -->
  <path d="M 238 256 L 250 268 L 274 244"
        fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Save SVG to public and app
fs.writeFileSync(path.join(publicDir, "logo.svg"), svgLogo);
fs.writeFileSync(path.join(appDir, "icon.svg"), svgLogo);

async function generate() {
  const svgBuffer = Buffer.from(svgLogo);

  // Generate 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  // Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  // Generate maskable icon 512x512 (with padding)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: "#0B1020",
    })
    .png()
    .toFile(path.join(publicDir, "icon-maskable.png"));

  // Generate apple touch icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  // Open Graph image 1200x630
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0B1020" />
        <stop offset="100%" stop-color="#121A2F" />
      </linearGradient>
      <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#14B8A6" />
        <stop offset="100%" stop-color="#38BDF8" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bgGrad)" />
    <!-- Ambient glow circles -->
    <circle cx="200" cy="150" r="280" fill="#14B8A6" opacity="0.08" filter="blur(60px)"/>
    <circle cx="1000" cy="450" r="320" fill="#38BDF8" opacity="0.08" filter="blur(60px)"/>

    <g transform="translate(180, 165) scale(0.6)">
      ${svgLogo.replace(/<\?xml[\s\S]*?\?>/, "").replace(/<svg[\s\S]*?>/, "").replace("</svg>", "")}
    </g>

    <text x="560" y="270" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="84" fill="#E8ECF8" direction="rtl">فَطِن</text>
    <text x="560" y="350" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="44" fill="url(#textGrad)" direction="rtl">قبل ما تضغط.. تأكد</text>
    <text x="560" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="#9AA6C4" direction="rtl">فاحص الرسائل والروابط الاحتيالية بالذكاء الاصطناعي للعراق</text>
  </svg>`;

  await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png()
    .toFile(path.join(publicDir, "og-image.png"));

  console.log("Icons and OG image generated successfully.");
}

generate().catch(console.error);
