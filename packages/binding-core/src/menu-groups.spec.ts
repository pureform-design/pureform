import { afterEach, describe, expect, it } from "vitest";

import { markMenuGroupEdges } from "./menu-groups";

const element = (part: string) => {
    const el = document.createElement("div");
    el.setAttribute("data-scope", "menu");
    el.setAttribute("data-part", part);
    return el;
};

const edges = (groups: Element[]) =>
    groups.map((group) =>
        [
            group.hasAttribute("data-first") ? "first" : "",
            group.hasAttribute("data-last") ? "last" : "",
        ].join(" "),
    );

describe("markMenuGroupEdges", () => {
    afterEach(() => document.body.replaceChildren());

    it("marks the surface's first and last groups, not a submenu's, and follows changes", async () => {
        const content = element("content");
        const loose = document.createElement("div");
        const a = element("item-group");
        const b = element("item-group");
        const submenu = element("content");
        const inner = element("item-group");
        submenu.append(inner);
        b.append(submenu);
        content.append(loose, a, b);
        document.body.append(content);
        const stop = markMenuGroupEdges(content);
        expect(edges([a, b, inner])).toEqual(["first ", " last", " "]);
        const c = element("item-group");
        content.append(c);
        await Promise.resolve();
        expect(edges([a, b, c])).toEqual(["first ", " ", " last"]);
        a.remove();
        await Promise.resolve();
        expect(edges([b, c])).toEqual(["first ", " last"]);
        stop();
    });
});
