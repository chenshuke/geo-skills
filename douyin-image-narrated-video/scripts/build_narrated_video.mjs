#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { EdgeTTS } from 'edge-tts-universal';
import { resolveRuntime, safeRelativeFile, sanitizeFilename } from './runtime.mjs';

const imageExts = ['.jpg', '.jpeg', '.png', '.webp'];
const audioExts = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];

function fail(message) { throw new Error(message); }
function unicodeLength(value) { return [...value].length; }
function numberIn(value, fallback, min, max, label) {
  const n = value == null ? fallback : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail(`${label} 必须在 ${min}-${max} 之间。`);
  return n;
}
function parseArgs(argv) {
  const result = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') result.dryRun = true;
    else if (argv[i] === '--project') result.project = argv[++i];
    else if (argv[i] === '--output-dir') result.outputDir = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') result.help = true;
    else fail(`未知参数：${argv[i]}`);
  }
  return result;
}
function run(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let stdout = '', stderr = '';
    if (capture) { child.stdout.on('data', d => stdout += d); child.stderr.on('data', d => stderr += d); }
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${path.basename(command)} 执行失败 (${code})\n${stderr}`)));
  });
}
async function sha256(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function readProject(projectFile) {
  const absolute = path.resolve(projectFile);
  if (!fs.existsSync(absolute)) fail(`项目文件不存在：${absolute}`);
  const sourceDir = path.dirname(absolute);
  let data;
  try { data = JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`project.json 无法解析：${error.message}`); }
  for (const key of ['brand', 'topic', 'title', 'description']) if (typeof data[key] !== 'string' || !data[key].trim()) fail(`${key} 不能为空。`);
  if (data.strict_title_30 === true && unicodeLength(data.title) !== 30) fail(`标题必须刚好 30 个 Unicode 字符，当前为 ${unicodeLength(data.title)}。`);
  if (!Array.isArray(data.hashtags) || data.hashtags.length < 1 || data.hashtags.some(v => typeof v !== 'string' || !v.trim())) fail('hashtags 必须是非空字符串数组。');
  if (!Array.isArray(data.cards) || data.cards.length < 1 || data.cards.length > 35) fail('cards 必须包含 1-35 张卡片。');
  const imageSeconds = numberIn(data.image_seconds, 3, 2, 10, 'image_seconds');
  const padding = numberIn(data.voice_padding_seconds, 0.6, 0.2, 3, 'voice_padding_seconds');
  const width = numberIn(data.width, 1080, 720, 4320, 'width');
  const height = numberIn(data.height, 1440, 720, 4320, 'height');
  if (width % 2 || height % 2) fail('width 和 height 必须为偶数。');
  const fps = Number(data.fps ?? 30); if (![24, 25, 30].includes(fps)) fail('fps 只允许 24、25、30。');
  const voiceRate = String(data.voice_rate ?? '+10%'); if (!/^[+-]\d{1,3}%$/.test(voiceRate)) fail('voice_rate 格式必须为 +N% 或 -N%。');
  const cards = data.cards.map((card, index) => {
    if (!card || typeof card.voiceover !== 'string' || !card.voiceover.trim()) fail(`cards[${index}].voiceover 不能为空。`);
    return { image: safeRelativeFile(sourceDir, card.image, `cards[${index}].image`, imageExts), voiceover: card.voiceover.trim() };
  });
  const backgroundAudio = data.background_audio ? safeRelativeFile(sourceDir, data.background_audio, 'background_audio', audioExts) : null;
  return { projectFile: absolute, sourceDir, brand: data.brand.trim(), topic: data.topic.trim(), outputName: sanitizeFilename(data.output_name || `${data.brand}_${data.topic}`), title: data.title.trim(), description: data.description.trim(), hashtags: data.hashtags.map(v => v.replace(/^#+/, '').trim()), pinnedComment: String(data.pinned_comment || '').trim(), imageSeconds, padding, width, height, fps, voice: String(data.voice || 'zh-CN-XiaoxiaoNeural'), voiceRate, backgroundAudio, cards };
}
function ensureOutput(outputDir, dryRun) {
  if (dryRun) return;
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length) fail(`输出目录不是空目录，拒绝覆盖：${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
}
async function synthesize(project, segmentsDir) {
  await fsp.mkdir(segmentsDir, { recursive: true });
  const outputs = [];
  for (let i = 0; i < project.cards.length; i++) {
    const out = path.join(segmentsDir, `${String(i + 1).padStart(2, '0')}.mp3`);
    console.log(`[TTS] ${i + 1}/${project.cards.length}`);
    const result = await new EdgeTTS(project.cards[i].voiceover, project.voice, { rate: project.voiceRate }).synthesize();
    const buffer = Buffer.from(await result.audio.arrayBuffer());
    if (!buffer.length) fail(`第 ${i + 1} 张卡片未收到语音数据。`);
    await fsp.writeFile(out, buffer); outputs.push(out);
  }
  return outputs;
}
async function probeJson(ffprobe, file) {
  const { stdout } = await run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], true);
  return JSON.parse(stdout);
}
async function duration(ffprobe, file) {
  const probe = await probeJson(ffprobe, file); const n = Number(probe.format?.duration);
  if (!Number.isFinite(n) || n <= 0) fail(`无法读取媒体时长：${file}`); return n;
}
async function copyImages(project, imagesDir) {
  await fsp.mkdir(imagesDir, { recursive: true }); const copied = [];
  for (let i = 0; i < project.cards.length; i++) {
    const src = project.cards[i].image; const out = path.join(imagesDir, `${String(i + 1).padStart(2, '0')}-${sanitizeFilename(path.basename(src))}`);
    await fsp.copyFile(src, out); copied.push(out);
  }
  return copied;
}
async function buildVideo(project, images, segments, durations, output, ffmpeg) {
  const slots = durations.map(d => Math.max(project.imageSeconds, d + project.padding));
  const args = ['-hide_banner', '-loglevel', 'warning', '-y'];
  images.forEach((img, i) => args.push('-loop', '1', '-t', slots[i].toFixed(3), '-i', img, '-i', segments[i]));
  if (project.backgroundAudio) args.push('-stream_loop', '-1', '-i', project.backgroundAudio);
  const filters = []; const videoLabels = []; const audioLabels = [];
  for (let i = 0; i < images.length; i++) {
    const vi = i * 2, ai = vi + 1;
    filters.push(`[${vi}:v]scale=${project.width}:${project.height}:force_original_aspect_ratio=decrease,pad=${project.width}:${project.height}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,fps=${project.fps},trim=duration=${slots[i].toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
    filters.push(`[${ai}:a]apad=pad_dur=${slots[i].toFixed(3)},atrim=duration=${slots[i].toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
    videoLabels.push(`[v${i}]`); audioLabels.push(`[a${i}]`);
  }
  filters.push(`${videoLabels.join('')}concat=n=${images.length}:v=1:a=0[video]`);
  filters.push(`${audioLabels.join('')}concat=n=${images.length}:v=0:a=1[voice]`);
  if (project.backgroundAudio) {
    const bgIndex = images.length * 2; const total = slots.reduce((a, b) => a + b, 0);
    filters.push(`[${bgIndex}:a]volume=0.08,atrim=duration=${total.toFixed(3)},asetpts=PTS-STARTPTS[bg]`);
    filters.push('[voice][bg]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[audio]');
  } else filters.push('[voice]alimiter=limit=0.95[audio]');
  args.push('-filter_complex', filters.join(';'), '-map', '[video]', '-map', '[audio]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', output);
  await run(ffmpeg, args); return slots;
}
async function contactSheet(video, output, cardCount, slots, ffmpeg) {
  const cols = Math.min(4, cardCount); const rows = Math.ceil(cardCount / cols); let t = 0;
  const times = slots.map(s => { const v = t + Math.min(s / 2, 1.5); t += s; return v; });
  const inputs = times.flatMap(time => ['-ss', time.toFixed(3), '-i', video]);
  const filters = times.map((_, i) => `[${i}:v]scale=270:-1[v${i}]`);
  filters.push(`${times.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${times.length}:layout=${times.map((_, i) => `${(i % cols)}*w0_${Math.floor(i / cols)}*h0`).join('|')}:fill=white[out]`);
  await run(ffmpeg, ['-hide_banner', '-loglevel', 'warning', '-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-frames:v', '1', '-update', '1', '-q:v', '2', output]);
}
async function writeCopy(project, file) {
  const lines = [`# ${project.title}`, '', project.description, '', project.hashtags.map(v => `#${v}`).join(' ')];
  if (project.pinnedComment) lines.push('', '## 置顶评论', '', project.pinnedComment);
  await fsp.writeFile(file, lines.join('\n') + '\n', 'utf8');
}
function validateProbe(probe, project) {
  const video = probe.streams?.find(v => v.codec_type === 'video'); const audio = probe.streams?.find(v => v.codec_type === 'audio');
  if (!video || !audio) fail('生成视频缺少视频流或音频流。');
  if (video.codec_name !== 'h264') fail(`视频编码不是 H.264：${video.codec_name}`);
  if (audio.codec_name !== 'aac') fail(`音频编码不是 AAC：${audio.codec_name}`);
  if (Number(video.width) !== project.width || Number(video.height) !== project.height) fail(`视频尺寸不正确：${video.width}x${video.height}`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { console.log('node scripts/build_narrated_video.mjs --project <project.json> --output-dir <new-dir> [--dry-run]'); return; }
  if (!args.project || !args.outputDir) fail('必须提供 --project 和 --output-dir。');
  const runtime = resolveRuntime(); const project = readProject(args.project); const outputDir = path.resolve(args.outputDir);
  ensureOutput(outputDir, args.dryRun);
  console.log(`[OK] 项目校验通过：${project.cards.length} 张卡片，${project.width}x${project.height}@${project.fps}fps`);
  if (args.dryRun) { console.log('[OK] dry-run 完成；未合成语音或视频。'); return; }
  const finalDir = path.join(outputDir, 'final'), imagesDir = path.join(outputDir, 'images'), segmentsDir = path.join(outputDir, 'audio', 'segments'), previewsDir = path.join(outputDir, 'previews');
  await Promise.all([fsp.mkdir(finalDir, { recursive: true }), fsp.mkdir(previewsDir, { recursive: true })]);
  const images = await copyImages(project, imagesDir); const segments = await synthesize(project, segmentsDir);
  const durations = []; for (const item of segments) durations.push(await duration(runtime.ffprobe, item));
  const video = path.join(finalDir, `${project.outputName}_逐卡口播版_final_hq.mp4`); const slots = await buildVideo(project, images, segments, durations, video, runtime.ffmpeg);
  const sheet = path.join(previewsDir, 'contact-sheet.jpg'); await contactSheet(video, sheet, images.length, slots, runtime.ffmpeg); await writeCopy(project, path.join(outputDir, '视频发布文案.md'));
  const probe = await probeJson(runtime.ffprobe, video); validateProbe(probe, project);
  const manifest = { status: 'generated_not_published', generated_at: new Date().toISOString(), runtime: { node: process.version, python_required: false, tts: 'edge-tts-universal', ffmpeg: runtime.ffmpeg, ffprobe: runtime.ffprobe }, project: { brand: project.brand, topic: project.topic, title: project.title, image_seconds_minimum: project.imageSeconds, voice_padding_seconds: project.padding, width: project.width, height: project.height, fps: project.fps, voice: project.voice, voice_rate: project.voiceRate }, cards: await Promise.all(project.cards.map(async (card, i) => ({ index: i + 1, image: path.relative(project.sourceDir, card.image), image_sha256: await sha256(card.image), voiceover: card.voiceover, raw_audio_seconds: Number(durations[i].toFixed(3)), slot_seconds: Number(slots[i].toFixed(3)), audio: path.relative(outputDir, segments[i]) }))), output_video: path.relative(outputDir, video), output_sha256: await sha256(video), ffprobe: probe };
  await fsp.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[OK] 视频：${video}`); console.log(`[OK] 预览：${sheet}`); console.log(`[OK] 发布文案：${path.join(outputDir, '视频发布文案.md')}`);
}

main().catch(error => { console.error(`[ERROR] ${error.message}`); process.exitCode = 1; });
