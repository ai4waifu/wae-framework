/** 导航契约：不实现 UI router，只定义可被框架 adapter 对接的协议。 */

export type LocationState = {
    pathname: string;
    search: string;
    hash: string;
};

export type RouteTarget = string | { pathname: string; search?: string; hash?: string };

export type Navigation = {
    current(): LocationState;
    navigate(to: RouteTarget): Promise<void>;
    replace(to: RouteTarget): Promise<void>;
};

function toHref(to: RouteTarget): string {
    if (typeof to === 'string') return to;
    return `${to.pathname}${to.search ?? ''}${to.hash ?? ''}`;
}

/** 浏览器 History API 的最小实现；框架 router 由 adapter 替换。 */
export function createBrowserNavigation(): Navigation {
    return {
        current() {
            if (typeof location === 'undefined') {
                return { pathname: '/', search: '', hash: '' };
            }
            return {
                pathname: location.pathname,
                search: location.search,
                hash: location.hash,
            };
        },
        async navigate(to) {
            if (typeof history !== 'undefined') {
                history.pushState({}, '', toHref(to));
            }
        },
        async replace(to) {
            if (typeof history !== 'undefined') {
                history.replaceState({}, '', toHref(to));
            }
        },
    };
}
