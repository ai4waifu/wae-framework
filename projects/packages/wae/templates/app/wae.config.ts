import { defineConfig } from '@wae/wae';

export default defineConfig({
    frontend: {
        framework: 'none',
        entry: './src/client/main.ts',
    },
    server: {
        entry: './src/server/app.ts',
        adapter: 'cloudflare',
    },
    target: 'web',
    // product: {
    //     update: { github: "your-org/your-app" },
    // },
});
