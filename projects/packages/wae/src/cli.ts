/** CLI 入口：由 `bin/wae.mjs` 调用。 */

import { runWaeCli } from '@wae/commander';
import { cmdBuild } from './cli/build.js';
import { cmdRun } from './cli/run.js';

export async function runCli(argv: string[]): Promise<void> {
    await runWaeCli(argv, {
        run: (options, mode) => cmdRun(options, { mode }),
        build: async (options) => {
            try {
                await cmdBuild(options);
            } catch (err) {
                console.error(err instanceof Error ? err.message : err);
                process.exitCode = 1;
            }
        },
    });
}
