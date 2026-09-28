# protocol-only

## What this example demonstrates

Focus only on `@wae/protocol` / `@wae/types` / `@wae/core` message shapes and encode/decode—no client or server
construction.

## Prerequisites

This directory **has no** `package.json` or source; you cannot `pnpm run check` here. Requires product packages
installed at repo root, or temporary `pnpm add` for self-test.

## Startup commands

No scripts in this directory. In a temporary file:

```bash

pnpm add @wae/protocol@0.0.0 @wae/types@0.0.0 @wae/core@0.0.0

```

```ts

import { createRpcRequest, encodeMessage, decodeClientMessage } from "@wae/protocol";



const req = createRpcRequest("ping", { n: 1 });

const wire = encodeMessage({ type: "rpc", request: req });

const back = decodeClientMessage(wire);

void back;

```

## Access URL

No browser URL. Success: encode/decode runs in your script (or product package tests).

## Key files

- This README only for now

- Implementation: [`@wae/protocol`](../../packages/protocol/readme.md)

## Request / event path (target semantics)

```text

createRpcRequest / ClientMessage

  → encodeMessage

  → bytes / JSON wire

  → decode*Message

  → HostMessage / RpcResponse

```

## Exercises

- Compare fields in `@wae/types` `RpcRequest`, `HostMessage`.

- Contrast with [`host/bridge`](../../../crates/wae-bridge/readme.md) `handle`: protocol is shape, bridge is delivery.

- Do not treat encode/decode as HTTP `createApp` routing practice.

## Differences from production apps

Production encode/decode must stay in sync with schema / Rust types; this directory is not a publishable example package
and does not use pnpm filter.

Dependencies: no manifest in this directory. For practice use `@wae/protocol`, `@wae/types`, `@wae/core`.

