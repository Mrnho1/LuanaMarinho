/**
 * Otimização de imagens — roda com `npm run images`.
 *
 * Os arquivos originais (em alta resolução) ficam em assets/_originals/ e não
 * vão para o repositório. O que é publicado em assets/img/ é sempre a versão
 * comprimida: JPEG/PNG enxuto + variante WebP para navegadores modernos.
 */
import sharp from 'sharp';
import { mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const IMG = 'assets/img';
const ORIG = 'assets/_originals';

/* Cada entrada gera o arquivo final + .webp. `width` = largura máxima. */
const TARGETS = [
  { file: 'escritorio.jpg', width: 1400, quality: 76 },
  { file: 'luana-marinho.jpg', width: 640, quality: 82 },
  { file: 'logo-luana.jpg', width: 640, quality: 82 },
  { file: 'icone-dourado.png', width: 360 },
  { file: 'icone-marca.png', width: 551 },
  { file: 'linkedin.png', width: 96 },
  { file: 'gmail.png', width: 96 },
  { file: 'whatsapp-2.png', width: 96 },
];

/* Imagem de compartilhamento (WhatsApp, LinkedIn, Google) — 1200x630. */
const OG = { from: 'logo-luana.jpg', to: 'og-image.jpg', width: 1200, height: 630 };

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function sizeOf(p) {
  try {
    return (await stat(p)).size;
  } catch {
    return 0;
  }
}

/** Guarda o original uma única vez; nas execuções seguintes lê de lá. */
async function source(file) {
  const kept = path.join(ORIG, file);
  const live = path.join(IMG, file);
  if (!existsSync(kept)) await copyFile(live, kept);
  return kept;
}

async function main() {
  await mkdir(ORIG, { recursive: true });

  for (const { file, width, quality = 80 } of TARGETS) {
    const src = await source(file);
    const out = path.join(IMG, file);
    const before = await sizeOf(src);

    const pipeline = sharp(src).resize({ width, withoutEnlargement: true });
    const isPng = file.endsWith('.png');

    await (isPng
      ? pipeline.clone().png({ compressionLevel: 9, palette: true })
      : pipeline.clone().jpeg({ quality, progressive: true, mozjpeg: true })
    ).toFile(out + '.tmp');

    await sharp(out + '.tmp').toFile(out);
    await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: isPng ? 90 : quality })
      .toFile(out.replace(/\.(jpe?g|png)$/i, '.webp'));

    const { width: w, height: h } = await sharp(out).metadata();
    console.log(`${file.padEnd(22)} ${kb(before)} → ${kb(await sizeOf(out))}  (${w}x${h})`);
  }

  const ogSrc = await source(OG.from);
  await sharp(ogSrc)
    .resize(OG.width, OG.height, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toFile(path.join(IMG, OG.to));
  console.log(`${OG.to.padEnd(22)} gerado (${OG.width}x${OG.height})`);

  /* Limpa os .tmp intermediários. */
  for (const f of await readdir(IMG)) {
    if (f.endsWith('.tmp')) await (await import('node:fs/promises')).unlink(path.join(IMG, f));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
