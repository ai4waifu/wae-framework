/** Load `wae build` Cloudflare Worker artifacts from a product directory. */

import fs from 'node:fs';
import path from 'node:path';
import type { WaeProductManifest } from '@wae/types';
import { WAE_PRODUCT_MANIFEST } from '@wae/types';

export type PublishArtifact = {
    manifest: WaeProductManifest;
    scriptPath: string;
    scriptBody: string;
    moduleFile: string;
};

export function loadPublishArtifact(productRoot: string): PublishArtifact {
    const manifestPath = path.join(productRoot, WAE_PRODUCT_MANIFEST);
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`missing ${WAE_PRODUCT_MANIFEST} under ${productRoot}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as WaeProductManifest;
    if (manifest.schemaVersion !== 1) {
        throw new Error(`unsupported ${WAE_PRODUCT_MANIFEST} schemaVersion ${manifest.schemaVersion}`);
    }
    if (!manifest.server || manifest.server.deployTarget !== 'cloudflare') {
        throw new Error(`${WAE_PRODUCT_MANIFEST} must include server.deployTarget=cloudflare for Worker publish`);
    }

    const scriptPath = path.resolve(productRoot, manifest.server.entry);
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`missing Worker bundle at ${manifest.server.entry}`);
    }

    const moduleFile = path.basename(manifest.server.entry).replaceAll('\\', '/');
    const scriptBody = fs.readFileSync(scriptPath, 'utf8');
    if (scriptBody.trim().length === 0) {
        throw new Error(`Worker bundle ${manifest.server.entry} is empty`);
    }

    return { manifest, scriptPath, scriptBody, moduleFile };
}
