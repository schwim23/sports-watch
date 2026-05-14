// Sharp is a transitive dep via Next.js — reach into pnpm's store to import it.
// We don't add `sharp` as a direct dep just for this one-off icon script.
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const svgPath = resolve(process.cwd(), "public/icon.svg");
  const svg = await readFile(svgPath);

  for (const size of [192, 512]) {
    const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
    const out = resolve(process.cwd(), `public/icon-${size}.png`);
    await writeFile(out, png);
    console.log(`wrote ${out} (${png.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
