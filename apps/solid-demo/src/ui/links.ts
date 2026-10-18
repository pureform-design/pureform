// Client-side navigation for plain links. pureform's links (a navigation destination, a list item
// or card with an `href`, a button `as="a"`) are `<a href>` elements the router doesn't know about;
// one click handler near the root sends same-origin clicks through the router instead of the
// browser, and leaves everything else (modified clicks, other targets, downloads) alone.

import { useRouter } from "@tanstack/solid-router";

export function useClientLinks(): (event: MouseEvent) => void {
    const router = useRouter();
    return (event) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        const anchor = (event.target as Element | null)?.closest?.("a[href]");
        if (
            !(anchor instanceof HTMLAnchorElement) ||
            anchor.target ||
            anchor.hasAttribute("download") ||
            anchor.getAttribute("aria-disabled") === "true"
        )
            return;
        const url = new URL(anchor.href);
        if (url.origin !== location.origin) return;
        event.preventDefault();
        void router.navigate({ href: url.pathname + url.search + url.hash });
    };
}
