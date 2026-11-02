import { testIds } from "@pureform/anatomy";
import { beforeAll, describe, expect, it } from "vitest";

import { PureformProvider } from ".";
import { GridList } from "./grid-list";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, mount } from "./testing/render";

const ids = testIds.gridList;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["gridList"]);
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const contents = () =>
    [...document.querySelectorAll(`[data-testid="${ids.content}"]`)].map(
        (content) => content.getBoundingClientRect(),
    );

describe("GridList on React Native", () => {
    it("is a list whose tiles are list items", async () => {
        await withRegistry(
            <GridList aria-label="Photos">
                <GridList.Tile>
                    <GridList.Content>
                        <GridList.Header>
                            <GridList.Headline>Sunrise</GridList.Headline>
                            <GridList.Subhead>Ana</GridList.Subhead>
                        </GridList.Header>
                    </GridList.Content>
                </GridList.Tile>
            </GridList>,
        );
        expect(byTestId(ids.root).getAttribute("role")).toBe("list");
        expect(byTestId(ids.tile).getAttribute("role")).toBe("listitem");
        expect(byTestId(ids.header).textContent).toBe("SunriseAna");
    });

    it("lays tiles out in the columns with the gutter between, at the aspect", async () => {
        await withRegistry(
            <div style={{ width: 320 }}>
                <GridList columns="3" gutter="large" aspect="landscape">
                    {Array.from({ length: 5 }, (_, key) => (
                        <GridList.Tile key={key}>
                            <GridList.Content />
                        </GridList.Tile>
                    ))}
                </GridList>
            </div>,
        );
        const rects = contents();
        // (320 - 2 * 16) / 3 each, three to a row, then a second row.
        expect(rects[0]!.width).toBeCloseTo(96, 0);
        expect(rects[0]!.height).toBeCloseTo(72, 0);
        expect(rects[1]!.left - rects[0]!.right).toBeCloseTo(16, 0);
        expect(rects[2]!.top).toBe(rects[0]!.top);
        expect(rects[3]!.top - rects[0]!.bottom).toBeCloseTo(16, 0);
        expect(rects[3]!.left).toBe(rects[0]!.left);
    });
});
