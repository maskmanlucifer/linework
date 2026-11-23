import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** `base: './'` keeps asset paths relative, so the build works at /linework/editor/ on GitHub Pages. */
export default defineConfig({ base: './', plugins: [react()] });
