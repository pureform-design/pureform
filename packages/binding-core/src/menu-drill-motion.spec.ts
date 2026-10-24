import { afterEach, describe, expect, it, vi } from "vitest";

import { menuDrillFrom, menuDrillTo } from "./menu-drill-motion";

// A menu's content with a row per entry, each with its label.
const level = (rows: readonly string[], height = 48) => {
    const content = document.createElement("div");
    content.setAttribute("role", "menu");
    content.style.cssText = "position: absolute; top: 0; left: 0; width: 200px";
    for (const value of rows) {
        const item = document.createElement("div");
        item.dataset["part"] = "item";
        item.dataset["value"] = value;
        item.style.cssText = `height: ${height}px; padding-inline-start: ${value === "pf-menu-back" ? 40 : 12}px`;
        const label = document.createElement("span");
        label.dataset["pfPart"] = "item-label";
        label.textContent = value;
        item.append(label);
        content.append(item);
    }
    document.body.append(content);
    return content;
};

describe("the drilled menu's motion", () => {
    afterEach(() => {
        document.body.replaceChildren();
        vi.restoreAllMocks();
    });

    it("grows the content to the new level, moves the pressed label into the header, and fades the rest in", () => {
        const content = level(["cut", "copy", "share"]);
        const snapshot = menuDrillFrom(content, "share", "pf-menu-back");
        expect(snapshot!.height).toBe(144);
        const was = snapshot!.label!;
        content.replaceChildren(
            ...level(["pf-menu-back", "mail", "link", "print"]).children,
        );
        const animations = menuDrillTo(content, snapshot);
        const [size, label, ...fades] = animations;
        const frames = (size!.effect as KeyframeEffect).getKeyframes();
        expect([frames[0]!["height"], frames[1]!["height"]]).toEqual([
            "144px",
            "192px",
        ]);
        const header = content.querySelector(
            '[data-value="pf-menu-back"] [data-pf-part="item-label"]',
        )!;
        expect((label!.effect as KeyframeEffect).target).toBe(header);
        const now = header.getBoundingClientRect();
        expect(
            (label!.effect as KeyframeEffect).getKeyframes()[0]!["transform"],
        ).toBe(`translate(${was.left - now.left}px, ${was.top - now.top}px)`);
        // The three other rows.
        expect(fades).toHaveLength(3);
    });

    it("does nothing under reduced motion", () => {
        vi.spyOn(window, "matchMedia").mockReturnValue({
            matches: true,
        } as MediaQueryList);
        const content = level(["cut", "share"]);
        const snapshot = menuDrillFrom(content, "share", "pf-menu-back");
        content.replaceChildren(...level(["pf-menu-back", "mail"]).children);
        expect(menuDrillTo(content, snapshot)).toEqual([]);
    });
});
