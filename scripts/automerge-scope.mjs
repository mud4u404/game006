// 工作流调用：node scripts/automerge-scope.mjs <Issue 正文文件> <PR 文件列表 json>
// 输出一行 json：{ ok, bad, allowed }。
import { readFileSync } from 'node:fs';
import { allowedFiles, judgeFiles } from './automerge.mjs';

const [bodyFile, filesFile] = process.argv.slice(2);
const body = readFileSync(bodyFile, 'utf8');
const files = JSON.parse(readFileSync(filesFile, 'utf8'));
const allowed = allowedFiles(body);
console.log(JSON.stringify({ ...judgeFiles(files, allowed), allowed: [...allowed].sort() }));
