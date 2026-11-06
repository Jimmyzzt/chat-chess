import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function buildPages(source = 'public', output = '.pages-dist') {
  const names = (await readdir(source)).sort();
  const files = await Promise.all(names.map(async name => [name, await readFile(join(source, name))]));
  const hash = createHash('sha256');
  for (const [name, contents] of files) hash.update(name).update(contents);
  const version = hash.digest('hex').slice(0, 12);
  const assets = new Map(names.filter(name => /\.(js|css|svg)$/.test(name)).map(name => [name, name.replace(/(\.[^.]+)$/, `.${version}$1`)]));
  await mkdir(output, { recursive: true });
  for (const [name, contents] of files) {
    let result = contents;
    if (/\.(html|js|css)$/.test(name)) {
      result = contents.toString('utf8');
      for (const [original, versioned] of assets) result = result.replaceAll(`./${original}`, `./${versioned}`);
    }
    await writeFile(join(output, assets.get(name) || name), result);
  }
  return { version, assets: Object.fromEntries(assets), directory: resolve(output) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(await buildPages());
