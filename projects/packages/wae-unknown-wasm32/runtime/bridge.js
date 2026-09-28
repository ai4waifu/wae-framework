// WAE WebView bridge 运行时占位。
// 正常路径使用结构化消息，不通过任意 eval 驱动 UI。
export function postToHost(message) {
    if (window.wae && typeof window.wae.postMessage === 'function') {
        window.wae.postMessage(JSON.stringify(message));
    }
}
