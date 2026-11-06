import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from '../scripts/build-pages.js';

test('Pages HTML and module imports reference matching versioned assets; edits change URLs', async () => {
  const source = await mkdtemp(join(tmpdir(), 'chat-chess-src-'));
  const output = await mkdtemp(join(tmpdir(), 'chat-chess-build-'));
  await writeFile(join(source, 'index.html'), '<link href="./style.css"><script src="./app.js"></script>');
  await writeFile(join(source, 'style.css'), '.theme-switch{display:flex}');
  await writeFile(join(source, 'app.js'), "import './core.js';");
  await writeFile(join(source, 'core.js'), 'export const value=1;');
  const first = await buildPages(source, output);
  const html = await readFile(join(output, 'index.html'), 'utf8');
  assert.ok(html.includes(first.assets['style.css']));
  assert.ok(html.includes(first.assets['app.js']));
  assert.ok((await readFile(join(output, first.assets['app.js']), 'utf8')).includes(first.assets['core.js']));
  assert.ok((await readdir(output)).includes(first.assets['style.css']));
  assert.equal((await buildPages(source, output)).version, first.version);
  await writeFile(join(source, 'style.css'), '.theme-switch{display:grid}');
  const second = await buildPages(source, output);
  assert.notEqual(second.assets['style.css'], first.assets['style.css']);
  assert.notEqual(second.assets['app.js'], first.assets['app.js']);
});
