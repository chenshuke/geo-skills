#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolveRuntime } from './runtime.mjs';

try {
  const { ffmpeg, ffprobe } = resolveRuntime();
  const ffmpegVersion = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0];
  const ffprobeVersion = spawnSync(ffprobe, ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0];
  console.log('Douyin Image Narrated Video Doctor');
  console.log(`Node: OK ${process.version}`);
  console.log(`TTS: OK edge-tts-universal`);
  console.log(`FFmpeg: OK ${ffmpegVersion}`);
  console.log(`FFprobe: OK ${ffprobeVersion}`);
  console.log('Python: NOT REQUIRED');
} catch (error) {
  console.error(`[ERROR] ${error.message}`);
  process.exit(1);
}
