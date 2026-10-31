// A card fills the width its parent offers unless asked to fit its content, whatever element it is.

import { testIds } from "@pureform/anatomy";
import { afterEach, describe, expect, it } from "vitest";

import { COMPONENTS } from "./components";
import { mountCase, settlePlaced } from "./harness/page";

const card = COMPONENTS.find((entry) => entry.component === "Card")!;
const WIDTH = 400;

const hosts: HTMLElement[] = [];
afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
});

const widthOf = async (props: Record<string, unknown>) => {
    const host = document.createElement("div");
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    hosts.push(host);
    mountCase(card, props, { host });
    await settlePlaced();
    return host
        .querySelector<HTMLElement>(`[data-testid="${testIds.card.root}"]`)!
        .getBoundingClientRect().width;
};

describe("Card width", () => {
    it.each([
        ["a button", {}],
        ["a link", { as: undefined, href: "#plan" }],
        ["a surface", { as: undefined }],
    ])("fills the parent as %s by default", async (_name, props) => {
        expect(await widthOf(props)).toBeCloseTo(WIDTH, 0);
    });

    it.each([
        ["a button", {}],
        ["a surface", { as: undefined }],
    ])("hugs its content as %s when it fits", async (_name, props) => {
        const width = await widthOf({ ...props, width: "fit" });
        expect(width).toBeGreaterThan(0);
        expect(width).toBeLessThan(WIDTH / 2);
    });
});
