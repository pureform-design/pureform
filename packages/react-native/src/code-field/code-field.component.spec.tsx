import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeField } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["codeField", "ripple"]);
});

const render = (view: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const cells = () =>
    [
        ...document.querySelectorAll('[data-testid="pf-code-field-input"]'),
    ] as HTMLInputElement[];

describe("CodeField on React Native", () => {
    it("takes a function of each cell in the input's style and slotProps", async () => {
        await render(
            <CodeField
                label="Code"
                length={3}
                defaultValue={["1", "2"]}
                style={{
                    input: (cell) =>
                        cell.value ? { opacity: 0.5 } : undefined,
                    control: { opacity: 0.75 },
                }}
                slotProps={{
                    input: (cell) => ({
                        accessibilityHint: `cell ${cell.index}`,
                    }),
                }}
            />,
        );
        expect(cells().map((cell) => getComputedStyle(cell).opacity)).toEqual([
            "0.5",
            "0.5",
            "1",
        ]);
    });
});
