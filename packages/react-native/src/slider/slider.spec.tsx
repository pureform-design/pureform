import { testIds } from "@pureform/anatomy";
import { beforeAll, describe, expect, it } from "vitest";

import { Slider } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { mount } from "../testing/render";

const ids = testIds.slider;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["slider", "ripple"]);
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("Slider on React Native", () => {
    it("takes a function of each thumb and marker in their style and slotProps", async () => {
        await withRegistry(
            <Slider
                aria-label="Range"
                defaultValue={[1, 3]}
                min={0}
                max={4}
                stops
                style={{
                    handle: (thumb) =>
                        thumb.value === 3 ? { opacity: 0.5 } : undefined,
                    marker: (marker) => ({ opacity: marker.index / 4 }),
                    track: { opacity: 0.25 },
                }}
                slotProps={{
                    handle: (thumb) => ({
                        accessibilityHint: `thumb ${thumb.index}`,
                    }),
                }}
            />,
        );
        const handles = all(ids.handle);
        expect(handles.map((each) => getComputedStyle(each).opacity)).toEqual([
            "1",
            "0.5",
        ]);
        expect(all(ids.marker)[2]!.style.opacity).toBe("0.5");
        expect(getComputedStyle(all(ids.track)[0]!).opacity).toBe("0.25");
    });
});
