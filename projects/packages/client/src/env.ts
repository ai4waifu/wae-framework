/** 运行环境检测（框架无关）。 */

export type RuntimeTarget = 'web' | 'desktop' | 'mobile' | 'unknown';

export type RuntimeEnvironment = {
    target: RuntimeTarget;
    hasNativeBridge: boolean;
    userAgent?: string;
};

export function detectEnvironment(hint?: Partial<RuntimeEnvironment>): RuntimeEnvironment {
    return {
        target: hint?.target ?? 'web',
        hasNativeBridge: hint?.hasNativeBridge ?? false,
        userAgent: hint?.userAgent,
    };
}
