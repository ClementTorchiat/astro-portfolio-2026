// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://clement-torchiat.fr',
  integrations: [react(), mdx(), sitemap()],
  vite: {
    optimizeDeps: {
      include: ['react-zoom-pan-pinch']
    }
  }
});