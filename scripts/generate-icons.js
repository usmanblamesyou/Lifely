const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const png2icons = require('png2icons');

const buildIconsDir = path.join(__dirname, '..', 'build', 'icons');

if (!fs.existsSync(buildIconsDir)) {
  fs.mkdirSync(buildIconsDir, { recursive: true });
}

// 512x512 SVG canvas with accent background and white infinity symbol
const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Accent Rounded Background -->
  <rect width="512" height="512" rx="108" ry="108" fill="#5b5fc7"/>
  
  <!-- Centered White Infinity Symbol (∞) -->
  <path d="M 180 256 C 130 190, 80 220, 80 256 C 80 292, 130 322, 180 256 C 230 190, 280 190, 332 256 C 382 322, 432 292, 432 256 C 432 220, 382 190, 332 256 C 280 322, 230 322, 180 256 Z" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="36" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
</svg>
`;

(async () => {
  console.log('Generating PNG icon (512x512)...');
  const pngPath = path.join(buildIconsDir, 'icon.png');
  const pngBuffer = await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toBuffer();

  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`Created: ${pngPath} (${pngBuffer.length} bytes)`);

  console.log('Generating ICO icon for Windows...');
  const icoPath = path.join(buildIconsDir, 'icon.ico');
  const icoBuffer = png2icons.createICO(pngBuffer, png2icons.HERMITE, 0, false);
  if (icoBuffer) {
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`Created: ${icoPath} (${icoBuffer.length} bytes)`);
  } else {
    console.error('Failed to create ICO file');
  }

  console.log('Generating ICNS icon for macOS...');
  const icnsPath = path.join(buildIconsDir, 'icon.icns');
  const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.HERMITE, 0);
  if (icnsBuffer) {
    fs.writeFileSync(icnsPath, icnsBuffer);
    console.log(`Created: ${icnsPath} (${icnsBuffer.length} bytes)`);
  } else {
    console.error('Failed to create ICNS file');
  }

  console.log('All icons generated successfully!');
})();
