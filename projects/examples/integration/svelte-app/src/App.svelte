<script lang="ts">
import { setWaeContext } from "@wae/adapter-svelte";
import { createClient } from "@wae/client";
import Panel from "./Panel.svelte";

const client = createClient({ server: { baseUrl: "/api" } });
setWaeContext(client);
</script>

<div class="shell">
  <header class="brand">
    <p class="eyebrow">WAE · desktop</p>
    <h1>Svelte</h1>
    <p class="lede">原生 WebView 壳 + Vite，经 <code>@wae/adapter-svelte</code> 注入 client。</p>
  </header>
  <Panel />
</div>

<style>
  .shell {
    min-height: 100%;
    display: grid;
    place-content: center;
    gap: 2.5rem;
    padding: 2.5rem 1.5rem;
    animation: rise 0.55s ease-out both;
  }

  .brand {
    text-align: center;
    max-width: 28rem;
    margin-inline: auto;
  }

  .eyebrow {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
  }

  h1 {
    margin: 0;
    font-size: clamp(2.6rem, 8vw, 3.75rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    background: linear-gradient(120deg, var(--ink), var(--accent));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .lede {
    margin: 0.85rem 0 0;
    color: var(--muted);
    line-height: 1.55;
    font-size: 0.95rem;
  }

  .lede code {
    font-family: var(--mono);
    font-size: 0.85em;
    color: var(--accent);
  }
</style>
