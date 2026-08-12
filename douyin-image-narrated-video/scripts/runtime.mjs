import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function assertNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 18 || (major === 18 && minor < 17)) {
    throw new Error(`需要 Node.js 18.17+，当前为 ${process.versions.node}`);
  }
}

export function resolveRuntime() {
  assertNodeVersion();
  let ffmpeg;
  let ffprobe;
  try {
    ffmpeg = require('ffmpeg-static');
    ffprobe = require('ffprobe-static').path;
    require.resolve('edge-tts-universal');
  } catch {
    throw new Error('缺少 Node 依赖。请先在技能目录运行 npm install。');
  }
  for (const [name, binary] of [['FFmpeg', ffmpeg], ['FFprobe', ffprobe]]) {
    if (!binary || !fs.existsSync(binary)) throw new Error(`${name} 跨平台二进制不可用，请重新运行 npm install。`);
  }
  return { ffmpeg, ffprobe };
}

export function safeRelativeFile(root, value, label, extensions = null) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空。`);
  if (path.isAbsolute(value) || value.split(/[\\/]+/).includes('..')) throw new Error(`${label} 必须是项目目录内的相对路径。`);
  const rootReal = fs.realpathSync(root);
  const candidate = path.resolve(root, value);
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) throw new Error(`${label} 文件不存在：${value}`);
  const real = fs.realpathSync(candidate);
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) throw new Error(`${label} 超出项目目录：${value}`);
  if (fs.statSync(real).size === 0) throw new Error(`${label} 是空文件：${value}`);
  if (fs.statSync(real).size > 50 * 1024 * 1024) throw new Error(`${label} 超过 50MB：${value}`);
  if (extensions && !extensions.includes(path.extname(real).toLowerCase())) throw new Error(`${label} 文件格式不支持：${value}`);
  return real;
}

export function sanitizeFilename(value) {
  return String(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 120) || 'douyin-video';
}

