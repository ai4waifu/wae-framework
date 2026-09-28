import { useWae, WaeProvider } from '@wae/adapter-react';
import { createClient } from '@wae/client';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const client = createClient({ server: { baseUrl: '/api' } });

function Panel() {
    const wae = useWae();
    const [status, setStatus] = useState('等待 ping…');
    const [ticks, setTicks] = useState(0);

    return (
        <div className="shell">
            <header className="brand">
                <p className="eyebrow">WAE · desktop</p>
                <h1>React</h1>
                <p className="lede">
                    原生 WebView 壳 + Vite，经 <code>@wae/adapter-react</code> 注入 client。
                </p>
            </header>
            <section className="stage" aria-live="polite">
                <p className="status">{status}</p>
                <button
                    type="button"
                    className="cta"
                    onClick={() => {
                        const next = ticks + 1;
                        setTicks(next);
                        setStatus(`client ok · baseUrl=${wae.server ? 'set' : '?'} · #${next}`);
                    }}
                >
                    ping client
                </button>
            </section>
        </div>
    );
}

const el = document.getElementById('root');
if (!el) throw new Error('#root missing');
createRoot(el).render(
    <StrictMode>
        <WaeProvider client={client}>
            <Panel />
        </WaeProvider>
    </StrictMode>,
);
