import svelte from '@wae/adapter-svelte';
import { defineConfig } from '@wae/wae';

export default defineConfig({
    frontend: {
        framework: 'svelte',
        adapter: svelte(),
        entry: './src/main.ts',
        bundler: 'vite',
    },
    target: 'desktop',
    platform: { client: 'win32-x64' },
});
