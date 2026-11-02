import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { TextArea } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["textArea"]);
});

const heightOf = () =>
    byTestId("pf-text-area-input").getBoundingClientRect().height;

const render = (autoGrow: boolean) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            <TextArea label="Bio" autoGrow={autoGrow} />
        </PureformProvider>,
    );

describe("TextArea on React Native", () => {
    it("grows with its text when autoGrow is on, and shrinks back", async () => {
        await render(true);
        const resting = heightOf();
        await interact(() => userEvent.click(byTestId("pf-text-area-input")));
        await interact(() =>
            userEvent.keyboard("a{Enter}b{Enter}c{Enter}d{Enter}e{Enter}f"),
        );
        const grown = heightOf();
        expect(grown).toBeGreaterThan(resting + 20);
        await interact(() => userEvent.keyboard("{Backspace>10/}"));
        expect(heightOf()).toBeLessThan(grown);
    });

    it("keeps its lines' height without autoGrow", async () => {
        await render(false);
        const resting = heightOf();
        await interact(() => userEvent.click(byTestId("pf-text-area-input")));
        await interact(() =>
            userEvent.keyboard("a{Enter}b{Enter}c{Enter}d{Enter}e{Enter}f"),
        );
        expect(heightOf()).toBe(resting);
    });
});
