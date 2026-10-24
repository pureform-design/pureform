// What this package reads from the platform it runs on, without the DOM's types: it runs on the
// web, React Native and the server alike.

/** The platform's language, where it has one (the browser's `navigator.language`). */
export const platformLanguage = (): string | undefined => {
    const language = (globalThis as { navigator?: { language?: unknown } })
        .navigator?.language;
    return typeof language === "string" && language ? language : undefined;
};
