/** WAE CLI command tree — Commander.js only; handlers injected by `@wae/wae`. */

import { Command } from 'commander';

export type WaeRunOptions = {
    platform?: string;
    port?: number;
    host?: string;
    /** Web default true; `--no-open` sets false. */
    open: boolean;
    /** Positional args after options (forwarded when needed). */
    extraArgs: string[];
};

export type WaeBuildOptions = {
    platform?: string;
    outDir?: string;
    extraArgs: string[];
};

export type RunDevHandler = (options: WaeRunOptions, mode: 'run' | 'dev') => Promise<void>;
export type BuildHandler = (options: WaeBuildOptions) => Promise<void>;
export type StubHandler = (cmd: string, args: string[]) => void | Promise<void>;

export type WaeCommandHandlers = {
    run?: RunDevHandler;
    build?: BuildHandler;
    stub?: StubHandler;
};

function attachRunOptions(cmd: Command): Command {
    return cmd
        .option('-p, --platform <id>', 'client platform id (web, win32-x64, …)')
        .option('--port <n>', 'dev server port')
        .option('--host <addr>', 'dev server bind address')
        .option('--open', 'open browser (web default)')
        .option('--no-open', 'do not open browser');
}

export function createWaeProgram(handlers: WaeCommandHandlers = {}): Command {
    const program = new Command().name('wae').description('WAE project CLI').showHelpAfterError('(use wae help for usage)');

    const runAction = async (mode: 'run' | 'dev', _opts: unknown, cmd: Command) => {
        const options = readRunOptions(cmd);
        if (handlers.run) {
            await handlers.run(options, mode);
            return;
        }
        (handlers.stub ?? defaultStub)(mode, options.extraArgs);
    };

    attachRunOptions(
        program
            .command('run')
            .description('Run app for current platform (web: Vite dev server)')
            .action(async (_opts, cmd) => runAction('run', _opts, cmd)),
    );

    attachRunOptions(
        program
            .command('dev')
            .description('Alias for wae run')
            .action(async (_opts, cmd) => runAction('dev', _opts, cmd)),
    );

    program
        .command('build')
        .description('Build shipped product (frontend + native addon + wae-product.json)')
        .option('-p, --platform <id>', 'client platform id (web, win32-x64, …)')
        .option('--out-dir <dir>', 'override product output base directory')
        .action(async (_opts, cmd) => {
            const options = readBuildOptions(cmd);
            if (handlers.build) {
                await handlers.build(options);
                return;
            }
            (handlers.stub ?? defaultStub)('build', options.extraArgs);
        });

    for (const name of ['create', 'preview', 'check', 'test', 'generate'] as const) {
        program
            .command(name)
            .description(`${name} (skeleton)`)
            .allowUnknownOption(true)
            .action(async (_opts, cmd) => {
                (handlers.stub ?? defaultStub)(name, cmd.args.slice());
            });
    }

    return program;
}

function defaultStub(cmd: string, args: string[]): void {
    console.log(`wae ${cmd} ${args.join(' ')}（尚未接线）`.trim());
}

export function readRunOptions(cmd: Command): WaeRunOptions {
    const opts = cmd.opts() as {
        platform?: string;
        port?: string;
        host?: string;
        open?: boolean;
    };
    return {
        platform: opts.platform,
        port: opts.port != null ? Number(opts.port) : undefined,
        host: opts.host,
        open: opts.open !== false,
        extraArgs: cmd.args.slice(),
    };
}

export function readBuildOptions(cmd: Command): WaeBuildOptions {
    const opts = cmd.opts() as { platform?: string; outDir?: string };
    return {
        platform: opts.platform,
        outDir: opts.outDir,
        extraArgs: cmd.args.slice(),
    };
}

/** Parse argv with the WAE command tree. */
export async function runWaeCli(argv: string[], handlers: WaeCommandHandlers): Promise<void> {
    const program = createWaeProgram(handlers);
    await program.parseAsync(['node', 'wae', ...argv]);
}
