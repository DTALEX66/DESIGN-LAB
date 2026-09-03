#!/usr/bin/env node
/**
 * check-android-drift.mjs — Android/WebView 生成物漂移门禁
 *
 * ODA4-0105 deterministic build gate:
 *  1. 从当前源码重建 android bundle 与 webview 资产
 *  2. 与 Git 已提交版本逐字节比对
 *  3. 任一不一致 => 退出码非 0（fail-closed），防止从过时 bundle 发布
 *
 * 用法：
 *   node scripts/check-android-drift.mjs           # 重建并比对（写工作树）
 *   node scripts/check-android-drift.mjs --check   # 仅比对已存在文件（不重建）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const TRACKED_DRIFT_SENSITIVE = [
  'android-minigame/game.js',
  'android-webview/app/src/main/assets/game.js',
  'android-webview/app/src/main/assets/styles.css',
  'android-webview/app/src/main/assets/index.html',
];

const checkOnly = process.argv.includes('--check');

if (!checkOnly) {
  // Rebuild android bundle + webview assets from current source
  execFileSync(process.execPath, ['build.js', 'android'], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, ['scripts/prepare-android-webview.mjs'], { cwd: root, stdio: 'pipe' });
}

let failures = 0;
for (const rel of TRACKED_DRIFT_SENSITIVE) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    console.log(`[drift] MISSING ${rel}`);
    failures++;
    continue;
  }
  // Byte-compare against Git HEAD blob via git cat-file
  try {
    const headBlob = execFileSync('git', ['show', `HEAD:fixtures/domains/game-visual/${rel}`], { cwd: root, encoding: 'utf8' });
    const working = readFileSync(abs, 'utf8');
    const same = headBlob === working;
    console.log(`[drift] ${same ? 'OK  ' : 'DIFF'} ${rel}`);
    if (!same) failures++;
  } catch (e) {
    // File may not exist at HEAD (untracked); treat as mismatch
    console.log(`[drift] DIFF ${rel} (not at HEAD)`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`[drift] FAIL: ${failures} tracked bundle(s) drift from committed source. Rebuild and commit before release.`);
  process.exit(1);
}
console.log('[drift] OK: all Android/WebView bundles match committed source.');
