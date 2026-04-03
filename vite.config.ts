import { defineConfig } from 'vite'
import { resolve } from 'path'
import { crx, defineManifest } from '@crxjs/vite-plugin'

const manifest = defineManifest({
  manifest_version: 3,
  name: 'seerr-helper',
  version: '0.1.0',
  description: 'Shows Seerr request status on Letterboxd film pages.',
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],
  content_scripts: [
    {
      matches: ['*://letterboxd.com/film/*'],
      js: ['content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  background: {
    service_worker: 'background/worker.ts',
    type: 'module',
  },
  options_ui: {
    page: 'options/index.html',
    open_in_tab: true,
  },
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_title: 'seerr-helper',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  web_accessible_resources: [
    {
      resources: ['icons/remixicon/remixicon.woff2'],
      matches: ['https://letterboxd.com/*'],
    },
  ],
})

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  plugins: [crx({ manifest })],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
})
