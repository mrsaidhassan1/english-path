import { cpSync, existsSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// In the single-file build, embed the favicon and drop the manifest so index.html works on its own.
const inlineIcon = (): Plugin => ({
  name: 'inline-icon',
  transformIndexHtml(html) {
    const icon = `data:image/png;base64,${readFileSync(new URL('./public/brand/sh-mark.png', import.meta.url)).toString('base64')}`;
    return html.replace(/\.\/brand\/sh-mark\.png/g, icon).replace(/\s*<link rel="manifest"[^>]*>/, '');
  },
});

// The single-file build keeps the recorded voices in an audio/ folder beside index.html
// (audio files play from a local folder; without the folder the app falls back to the browser voice).
const copyAudio = (): Plugin => ({
  name: 'copy-audio',
  closeBundle() {
    const from = new URL('./public/audio', import.meta.url);
    if (existsSync(from)) cpSync(from, new URL('./dist-single/audio', import.meta.url), { recursive: true });
  },
});

// `npm run build` → dist/ for any static host.
// `npm run build:single` → dist-single/index.html, one file that opens by double-click (no server).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile(), inlineIcon(), copyAudio()] : [react()],
  publicDir: mode === 'single' ? false : 'public',
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2500,
  },
  test: { environment: 'node' },
}));
