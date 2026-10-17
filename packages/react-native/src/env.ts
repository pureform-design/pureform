// Whether this is a development build. Bundlers replace `process.env.NODE_ENV`, as React itself
// relies on; the library build leaves it for the app's bundler.

declare const process: { readonly env: { readonly NODE_ENV?: string } };

export const isDev: boolean = process.env.NODE_ENV !== "production";
