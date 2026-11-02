import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Carousel } from ".";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { interact, mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["carousel", "ripple"]);
});

const ITEMS = [0, 1, 2, 3].map((n) => ({
    content: `Item ${n}`,
    "aria-label": `Item ${n}`,
}));

describe("Carousel keys on the web", () => {
    it("moves focus between items with the arrow keys, Home and End", async () => {
        await mount(
            <PureformProvider registry={registry} motion="reduce">
                <Carousel aria-label="Trips" items={ITEMS} />
            </PureformProvider>,
        );
        const masks = () => [
            ...document.querySelectorAll<HTMLElement>('[role="button"]'),
        ];
        masks()[0]!.focus();
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        expect(document.activeElement).toBe(masks()[1]);
        await interact(() => userEvent.keyboard("{End}"));
        expect(document.activeElement).toBe(masks()[3]);
        await interact(() => userEvent.keyboard("{ArrowLeft}"));
        expect(document.activeElement).toBe(masks()[2]);
        await interact(() => userEvent.keyboard("{Home}"));
        expect(document.activeElement).toBe(masks()[0]);
    });
});

describe("Carousel keys and the page", () => {
    it("reports the page the arrow keys moved to", async () => {
        const pages: number[] = [];
        await mount(
            <PureformProvider registry={registry} motion="reduce">
                <Carousel
                    aria-label="Trips"
                    items={ITEMS}
                    onPageChange={({ page }) => pages.push(page)}
                />
            </PureformProvider>,
        );
        document.querySelectorAll<HTMLElement>('[role="button"]')[0]!.focus();
        await interact(() => userEvent.keyboard("{ArrowRight}{ArrowRight}"));
        expect(pages).toEqual([1, 2]);
    });
});
