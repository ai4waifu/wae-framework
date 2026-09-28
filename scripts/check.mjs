#!/usr/bin/env node
/** CI 检查入口（reshape 后）。 */
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
    console.log(`> ${cmd} ${args.join(' ')}`);
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
    if (r.status !== 0) process.exit(r.status ?? 1);
}

run('cargo', ['fmt', '--all', '--', '--check']);
run('cargo', ['clippy', '--workspace', '--all-targets', '--', '-D', 'warnings']);
run('cargo', ['check', '--workspace']);
run('cargo', ['test', '--workspace']);
