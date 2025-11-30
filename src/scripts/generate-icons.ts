import sharp from "sharp";
import { writeFileSync } from "fs";
import { join } from "path";

// Create a simple SVG icon with a picture frame theme
const createIconSVG = (size: number) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <rect x="${size * 0.15}" y="${size * 0.15}" width="${size * 0.7}" height="${size * 0.7}" 
        fill="none" stroke="white" stroke-width="${size * 0.05}" rx="${size * 0.05}"/>
  <rect x="${size * 0.2}" y="${size * 0.2}" width="${size * 0.6}" height="${size * 0.6}" 
        fill="rgba(255,255,255,0.2)" rx="${size * 0.03}"/>
  <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.04}" fill="white" opacity="0.8"/>
  <circle cx="${size * 0.7}" cy="${size * 0.3}" r="${size * 0.04}" fill="white" opacity="0.8"/>
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.08}" fill="white" opacity="0.6"/>
</svg>
`;

async function generateIcons() {
  const publicDir = join(process.cwd(), "public");
  const sizes = [
    { name: "pwa-192x192.png", size: 192 },
    { name: "pwa-512x512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const { name, size } of sizes) {
    const svg = createIconSVG(size);
    const png = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    writeFileSync(join(publicDir, name), png);
    console.log(`Generated ${name}`);
  }

  // Also create mask-icon.svg for Safari
  const maskIcon = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#000000" rx="76.8"/>
  <rect x="76.8" y="76.8" width="358.4" height="358.4" 
        fill="none" stroke="white" stroke-width="25.6" rx="25.6"/>
  <rect x="102.4" y="102.4" width="307.2" height="307.2" 
        fill="rgba(255,255,255,0.2)" rx="15.36"/>
  <circle cx="153.6" cy="153.6" r="20.48" fill="white" opacity="0.8"/>
  <circle cx="358.4" cy="153.6" r="20.48" fill="white" opacity="0.8"/>
  <circle cx="256" cy="256" r="40.96" fill="white" opacity="0.6"/>
</svg>`;
  
  writeFileSync(join(publicDir, "mask-icon.svg"), maskIcon);
  console.log("Generated mask-icon.svg");
}

generateIcons().catch(console.error);

