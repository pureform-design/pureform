// Zag's avatar, re-exported so bindings take every machine from one package. It tracks whether the
// picture has loaded: the image is hidden until then, and the fallback until it has, or when it
// fails. The avatar isn't interactive, so it emits nothing to an interaction source.

export * from "@zag-js/avatar";
export { anatomy, parts } from "./avatar.anatomy";
