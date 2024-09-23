import type { Prefix } from "../types";

function createNormalizedPrefix(
    tokenPrefix: string,
    utilityPrefix: string,
    jsxPrefix: string,
    textStylePrefix: string,
) {
    return {
        tokenPrefix,
        utilityPrefix,
        jsxPrefix,
        textStylePrefix,
    };
}

export function normalizePrefix(prefix?: Prefix) {
    if (typeof prefix === "string" || typeof prefix === "undefined") {
        return createNormalizedPrefix(
            prefix ?? "",
            prefix ?? "",
            prefix ?? "",
            prefix ?? "",
        );
    }

    const defaultPrefix = prefix.default;
    const tokenPrefix = prefix.tokenPrefix ?? defaultPrefix;
    const utilityPrefix = prefix.utilityPrefix ?? defaultPrefix;
    const jsxPrefix = prefix.jsxPrefix ?? defaultPrefix;
    const textStylePrefix = prefix.textStylePrefix ?? defaultPrefix;

    return createNormalizedPrefix(
        tokenPrefix,
        utilityPrefix,
        jsxPrefix,
        textStylePrefix,
    );
}
