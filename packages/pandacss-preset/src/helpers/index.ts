import { capitalize, lowerFirst } from "@repo/utils/string";
import type { NormalPrefix, Prefix } from "../types";
import type { BaseTextStyleName, Typography } from "@repo/ui-utils";

function createNormalizedPrefix(
    tokenPrefix: string,
    utilityPrefix: string,
    componentPrefix: string,
    textStylePrefix: string,
    cssVarPrefix: string,
): NormalPrefix {
    return {
        tokenPrefix,
        utilityPrefix,
        componentPrefix,
        textStylePrefix,
        cssVarPrefix,
    };
}

export function normalizePrefix(prefix?: Prefix) {
    if (typeof prefix === "string" || typeof prefix === "undefined") {
        return createNormalizedPrefix(
            prefix ?? "",
            prefix ?? "",
            prefix ?? "",
            prefix ?? "",
            prefix ?? "",
        );
    }

    const defaultPrefix = prefix.default;
    const tokenPrefix = prefix.tokenPrefix ?? defaultPrefix;
    const utilityPrefix = prefix.utilityPrefix ?? defaultPrefix;
    const jsxPrefix = prefix.componentPrefix ?? defaultPrefix;
    const textStylePrefix = prefix.textStylePrefix ?? defaultPrefix;
    const cssVarPrefix = prefix.cssVarPrefix ?? defaultPrefix;

    return createNormalizedPrefix(
        tokenPrefix,
        utilityPrefix,
        jsxPrefix,
        textStylePrefix,
        cssVarPrefix,
    );
}

function isNormalPrefix(prefix: Prefix | NormalPrefix): prefix is NormalPrefix {
    return (
        typeof prefix === "object" &&
        "tokenPrefix" in prefix &&
        "utilityPrefix" in prefix &&
        "componentPrefix" in prefix &&
        "textStylePrefix" in prefix
    );
}

export function prefix(
    method: "dot" | "camel" | "pascal" | "kebab" | "snake",
    prefix: Prefix | NormalPrefix,
    key: string,
    type: "token" | "utility" | "component" | "textStyle" | "cssVar",
) {
    const pf = isNormalPrefix(prefix) ? prefix : normalizePrefix(prefix);

    let actualPrefix: string;
    switch (type) {
        case "token":
            actualPrefix = pf.tokenPrefix;
            break;
        case "utility":
            actualPrefix = pf.utilityPrefix;
            break;
        case "component":
            actualPrefix = pf.componentPrefix;
            break;
        case "textStyle":
            actualPrefix = pf.textStylePrefix;
            break;
        case "cssVar":
            actualPrefix = pf.cssVarPrefix;
            break;
        default:
            throw new Error("Invalid prefix type");
    }

    switch (method) {
        case "dot":
            return `${actualPrefix}.${key}`;
        case "camel":
            return `${lowerFirst(actualPrefix)}${capitalize(key)}`;
        case "pascal":
            return `${capitalize(actualPrefix)}${capitalize(key)}`;
        case "kebab":
            return `${actualPrefix}-${key}`;
        case "snake":
            return `${actualPrefix}_${key}`;
        default:
            throw new Error("Invalid method");
    }
}
export function getCssVar(pref: NormalPrefix, name: string) {
    return `--${prefix("kebab", pref, name, "cssVar")}`;
}

export function getToken(pref: NormalPrefix, name: string) {
    return prefix("dot", pref, name, "token");
}

export function getUtility(pref: NormalPrefix, name: string) {
    return prefix("camel", pref, name, "utility");
}
