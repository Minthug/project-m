import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../assets/pixellab-You-can-categorize-them-by-emo-1778650265196.png');

// hue rotation in degrees (0 = original blue)
// cool colors: hue rotation + saturation
// warm colors: tint (더 정확한 색 표현)
const colors = [
  { name: 'sad',       mode: 'hue',  hue: 0,   saturation: 1.0  },
  { name: 'blank',     mode: 'hue',  hue: 5,   saturation: 0.85 },
  { name: 'fear',      mode: 'hue',  hue: 48,  saturation: 1.6  },
  { name: 'contempt',  mode: 'hue',  hue: 110, saturation: 1.2  },
  { name: 'disgust',   mode: 'hue',  hue: 265, saturation: 1.6  },
  { name: 'angry',     mode: 'tint', tint: { r: 220, g: 60,  b: 60  } },
  { name: 'surprised', mode: 'tint', tint: { r: 249, g: 115, b: 22  } },
  { name: 'happy',     mode: 'tint', tint: { r: 234, g: 179, b: 8   } },
];

const { width, height } = await sharp(src).metadata();

// ── 배경 제거 (flood fill from corners) ──────────────────────────
const { data: rawPixels } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const pixels = new Uint8Array(rawPixels);
const BG = { r: 127, g: 129, b: 130 };
const THRESH = 30; // 배경색 허용 거차

function colorDist(i) {
  return Math.abs(pixels[i] - BG.r) + Math.abs(pixels[i+1] - BG.g) + Math.abs(pixels[i+2] - BG.b);
}

const visited = new Uint8Array(width * height);
const queue = [];

function enqueue(x, y) {
  const idx = y * width + x;
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  if (visited[idx]) return;
  const pi = idx * 4;
  if (colorDist(pi) > THRESH) return;
  visited[idx] = 1;
  queue.push(idx);
}

// 네 모서리에서 시작
enqueue(0, 0); enqueue(width-1, 0);
enqueue(0, height-1); enqueue(width-1, height-1);

while (queue.length > 0) {
  const idx = queue.shift();
  const x = idx % width, y = Math.floor(idx / width);
  const pi = idx * 4;
  // 배경색에 가까울수록 더 투명하게 (anti-aliasing 처리)
  const dist = colorDist(pi);
  pixels[pi + 3] = Math.min(pixels[pi + 3], Math.round((dist / THRESH) * 80));
  enqueue(x+1, y); enqueue(x-1, y);
  enqueue(x, y+1); enqueue(x, y-1);
}

// 배경 제거된 이미지를 버퍼로 보관
const cleanSrc = await sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
  .png().toBuffer();

// alpha 채널 추출
const alphaBuffer = await sharp(cleanSrc)
  .extractChannel('alpha')
  .raw()
  .toBuffer();

for (const item of colors) {
  const out = path.join(__dirname, `../assets/slime-${item.name}.png`);

  let rgbBuf;
  if (item.mode === 'hue') {
    rgbBuf = await sharp(cleanSrc)
      .modulate({ hue: item.hue, saturation: item.saturation })
      .removeAlpha()
      .raw()
      .toBuffer();
  } else {
    rgbBuf = await sharp(cleanSrc)
      .tint(item.tint)
      .removeAlpha()
      .raw()
      .toBuffer();
  }

  // 색 변환된 RGB + 원본 alpha 합성
  await sharp(rgbBuf, { raw: { width, height, channels: 3 } })
    .joinChannel(alphaBuffer, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(out);

  console.log(`✓ slime-${item.name}.png`);
}
