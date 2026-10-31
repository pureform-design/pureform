// The slider's inset icon, styled: it sits in the active track, in by the theme's padding, until
// the active track (less the handle's clearance) is too short for it and its padding either side;
// then it's marked overflowing and sits past the handle's gap at the start of the inactive track.
// The binding reads the theme's measures back from the layout, so a theme's `handleClearance`
// moves the cut-off.

import { testIds } from "@pureform/anatomy";
import { afterEach, describe, expect, it } from "vitest";

import { slider } from "./components";
import { mountCase, settlePlaced } from "./harness/page";
import type { SceneProvider } from "./harness/scene";

const ids = testIds.slider;
const LENGTH = 400;

const hosts: HTMLElement[] = [];
afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
});

const mount = async (value: number, provider?: SceneProvider) => {
    const host = document.createElement("div");
    host.style.width = `${LENGTH}px`;
    document.body.append(host);
    hosts.push(host);
    mountCase(
        slider,
        { defaultValue: value, size: "large", insetIcon: "♪" },
        provider ? { host, provider } : { host },
    );
    await settlePlaced();
    // The binding reads the theme's measures after the first draw, which can move the icon.
    await settlePlaced();
    const part = (id: string) =>
        host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const root = part(ids.root).getBoundingClientRect();
    const icon = part(ids.insetIcon);
    return {
        overflowing: icon.hasAttribute("data-pf-overflowing"),
        // How far in from the root's start the icon and the inactive track start.
        icon: icon.getBoundingClientRect().left - root.left,
        track: part(ids.track).getBoundingClientRect().left - root.left,
        length: root.width,
    };
};

describe("Slider inset icon", () => {
    it("sits in the active track while it fits, in by its padding", async () => {
        // 40% of 400px is 160px, less the 8px clearance: room for 20px and 10px either side.
        const at = await mount(40);
        expect(at.length).toBeCloseTo(LENGTH, 0);
        expect(at.overflowing).toBe(false);
        expect(at.icon).toBeCloseTo(10, 0);
    });

    it("moves past the handle's gap once the active track is too short", async () => {
        // 10% is 40px, less the clearance: 32px, short of 40.
        const at = await mount(10);
        expect(at.overflowing).toBe(true);
        expect(at.track).toBeCloseTo(40 + 8, 0);
        expect(at.icon).toBeCloseTo(40 + 8 + 10, 0);
    });

    it("cuts off by the theme's handle clearance", async () => {
        // 13% is 52px: less the default 8px it fits (44 ≥ 40), less 14px it doesn't (38).
        expect((await mount(13)).overflowing).toBe(false);
        const at = await mount(13, {
            overrides: { "components.slider.handleClearance": "14px" },
        });
        expect(at.track).toBeCloseTo(52 + 14, 0);
        expect(at.overflowing).toBe(true);
        expect(at.icon).toBeCloseTo(52 + 14 + 10, 0);
    });
});
