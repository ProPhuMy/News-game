import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Client lives in src/client (index.html owned by Gemini 2). In dev, Codex's server mounts Vite in middleware mode.
export default defineConfig({
  root: 'src/client',
  publicDir: '../../public',
  plugins: [react()],
  build: { outDir: '../../dist/client', emptyOutDir: true },
});
