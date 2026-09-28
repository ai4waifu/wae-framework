/** `wae deploy` — thin host deploy wrapper (Cloudflare via wrangler today). */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { WaeDeployOptions } from '@wae/commander';
import { WAE_PRODUCT_MANIFEST } from '@wae/types';
import { loadWaeConfig } from './load-config.js';
import { resolveDeployTarget } from './deploy-target.js';
import { resolvePlatformId } from './platform.js';

export function resolveDeployProductDir(cwd: string, options: WaeDeployOptions, config: Awaited<ReturnType<typeof loadWaeConfig>>['config']): string {
    const platformId = resolvePlatformId(options, config);
    const baseOut = options.outDir ?? config.product?.outDir ?? 'dist';
    return path.resolve(cwd, baseOut, platformId);
}

export async function cmdDeploy(options: WaeDeployOptions): Promise<void> {
    const cwd = process.cwd();
    const { config } = await loadWaeConfig(cwd);
    const deployTarget = resolveDeployTarget(config);
    if (deployTarget !== 'cloudflare') {
        throw new Error(`wae deploy only supports deployTarget=cloudflare today (got ${deployTarget ?? 'unset'})`);
    }

    const productDir = resolveDeployProductDir(cwd, options, config);
    const wranglerPath = path.join(productDir, 'wrangler.toml');
    const manifestPath = path.join(productDir, WAE_PRODUCT_MANIFEST);
    if (!fs.existsSync(wranglerPath)) {
        throw new Error(`missing ${path.relative(cwd, wranglerPath) || 'wrangler.toml'} — run wae build first`);
    }
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`missing ${path.relative(cwd, manifestPath) || WAE_PRODUCT_MANIFEST} — run wae build first`);
    }

    const wranglerBin = options.wranglerBin ?? 'wrangler';
    const args = ['deploy', ...options.extraArgs];
    console.log(`[wae deploy] cwd=${productDir}`);
    console.log(`[wae deploy] ${wranglerBin} ${args.join(' ')}`);

    await new Promise<void>((resolve, reject) => {
        const child = spawn(wranglerBin, args, {
            cwd: productDir,
            stdio: 'inherit',
            shell: process.platform === 'win32',
            windowsHide: true,
        });
        child.on('error', (error) => {
            reject(new Error(`failed to launch ${wranglerBin}: ${error.message}`));
        });
        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${wranglerBin} deploy exited with ${code ?? 'unknown'}`));
        });
    });
}
