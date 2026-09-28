import solid from '@wae/adapter-solid';
import { defineConfig } from '@wae/wae';

export default defineConfig({
    frontend: {
        framework: 'solid',
        adapter: solid(),
        entry: './src/main.tsx',
        bundler: 'vite',
    },
    target: 'desktop',
    platform: { client: 'win32-x64' },
});
