/** Map WAE `wae.config` binding specs to Cloudflare Workers upload metadata wire shape. */

export type WorkerBindingWire = Record<string, unknown> & {
    type: string;
    name: string;
};

export type CloudflareBindingSpec =
    | { kind: 'plain_text'; name: string; text: string }
    | { kind: 'secret_text'; name: string; text: string }
    | { kind: 'kv_namespace'; name: string; namespaceId: string }
    | { kind: 'r2_bucket'; name: string; bucketName: string }
    | { kind: 'd1'; name: string; id: string }
    | { kind: 'queue'; name: string; queueName: string }
    | { kind: 'service'; name: string; service: string; environment?: string }
    | {
          kind: 'durable_object_namespace';
          name: string;
          className: string;
          scriptName?: string;
      };

export type CloudflareBindingInput = CloudflareBindingSpec | WorkerBindingWire;

function assertBindingName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
        throw new Error('Cloudflare binding name must not be empty');
    }
    return trimmed;
}

function isWorkerBindingWire(input: CloudflareBindingInput): input is WorkerBindingWire {
    return typeof input === 'object' && input !== null && 'type' in input && !('kind' in input);
}

export function resolveWorkerBinding(input: CloudflareBindingInput): WorkerBindingWire {
    if (isWorkerBindingWire(input)) {
        const name = assertBindingName(String(input.name));
        const type = String(input.type).trim();
        if (!type) {
            throw new Error(`Cloudflare binding ${name} requires a type`);
        }
        return { ...input, type, name };
    }

    const name = assertBindingName(input.name);
    switch (input.kind) {
        case 'plain_text':
            return { type: 'plain_text', name, text: input.text };
        case 'secret_text':
            return { type: 'secret_text', name, text: input.text };
        case 'kv_namespace':
            return { type: 'kv_namespace', name, namespace_id: input.namespaceId };
        case 'r2_bucket':
            return { type: 'r2_bucket', name, bucket_name: input.bucketName };
        case 'd1':
            return { type: 'd1', name, id: input.id };
        case 'queue':
            return { type: 'queue', name, queue_name: input.queueName };
        case 'service': {
            const binding: WorkerBindingWire = { type: 'service', name, service: input.service };
            if (input.environment) binding.environment = input.environment;
            return binding;
        }
        case 'durable_object_namespace': {
            const binding: WorkerBindingWire = {
                type: 'durable_object_namespace',
                name,
                class_name: input.className,
            };
            if (input.scriptName) binding.script_name = input.scriptName;
            return binding;
        }
        default:
            throw new Error(`unsupported Cloudflare binding kind ${(input as { kind?: string }).kind ?? 'unknown'}`);
    }
}

export function resolveWorkerBindings(inputs: CloudflareBindingInput[]): WorkerBindingWire[] {
    return inputs.map((input) => resolveWorkerBinding(input));
}
