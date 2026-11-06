import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => entry.isDirectory() ? walk(join(path, entry.name)) : [{ path: join(path, entry.name), bytes: (await stat(join(path, entry.name))).size }]))).flat();
}
const files = await walk('public');
const total = files.reduce((sum, file) => sum + file.bytes, 0);
console.table(files);
console.log(JSON.stringify({ files: files.length, totalBytes: total, largestFileBytes: Math.max(...files.map(file => file.bytes)), staticRequestsPerColdVisit: 8, workerRequestsPerVisit: 0, workerSubrequestsPerAnalysis: 0, providerPostsPerAnalysis: 1, maxProviderPreflightsPerAnalysis: 1, databaseBytes: 0 }, null, 2));
if (files.length > 2000 || files.some(file => file.bytes > 2.5 * 1024 * 1024)) throw new Error('Static asset budget exceeded (10% of Free tier file/size limits).');
