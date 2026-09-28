/** CLI 入口：由 `bin/wae.mjs` 调用。 */

import { runWaeCli } from '@wae/commander';
import { cmdBuild } from './cli/build.js';
import { cmdCreate } from './cli/create.js';
import { cmdDeploy } from './cli/deploy.js';
import { cmdRun } from './cli/run.js';

export async function runCli(argv: string[]): Promise<void> {
    await runWaeCli(argv, {
        run: (options, mode) => cmdRun(options, { mode }),
        build: async (options) => {
            try {
                await cmdBuild(options);
            } catch (err) {
                console.error(err instanceof Error ? err.message : String(err));
                process.exitCode = 1;
            }
        },
        create: async (options) => {
            try {
                await cmdCreate(options);
            } catch (err) {
                console.error(err instanceof Error ? err.message : String(err));
                process.exitCode = 1;
            }
        },
        deploy: async (options) => {
            try {
                await cmdDeploy(options);
            } catch (err) {
                console.error(err instanceof Error ? err.message : String(err));
                process.exitCode = 1;
            }
        },
    });
}
