import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { GridList } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { Errored, mount, quietly, settle } from "../testing/render";

const ids = testIds.gridList;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

describe("GridList", () => {
    it("is a list of tiles, each a list item holding a content with a media, a header and a footer", async () => {
        withRegistry(
            <GridList aria-label="Photos" columns="4" aspect="wide">
                <GridList.Tile>
                    <GridList.Content>
                        <GridList.Media src="a.png" alt="Sunrise" />
                        <GridList.Header>
                            <GridList.Headline>Sunrise</GridList.Headline>
                        </GridList.Header>
                        <GridList.Footer>
                            <GridList.Subhead>Ana</GridList.Subhead>
                        </GridList.Footer>
                    </GridList.Content>
                </GridList.Tile>
            </GridList>,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("DIV");
        expect(root.getAttribute("role")).toBe("list");
        expect(root.className).toBe(
            "grid-list grid-list--columns-4 grid-list--aspect-wide",
        );
        const tile = byTestId(ids.tile);
        expect(tile.parentElement).toBe(root);
        expect(tile.getAttribute("role")).toBe("listitem");
        const content = byTestId(ids.content);
        expect(content.parentElement).toBe(tile);
        expect(
            [...content.children].map((part) =>
                part.getAttribute("data-pf-part"),
            ),
        ).toEqual(["media", "header", "footer"]);
        expect(byTestId(ids.media).tagName).toBe("IMG");
        expect(byTestId(ids.headline).textContent).toBe("Sunrise");
        expect(byTestId(ids.subhead).textContent).toBe("Ana");
    });

    it("leaves the roles to a list element and its items", async () => {
        withRegistry(
            <GridList as="ul" gutter="none">
                <GridList.Tile as="li" />
            </GridList>,
        );
        await settle();
        expect(byTestId(ids.root).tagName).toBe("UL");
        expect(byTestId(ids.root).hasAttribute("role")).toBe(false);
        expect(byTestId(ids.tile).tagName).toBe("LI");
        expect(byTestId(ids.tile).hasAttribute("role")).toBe(false);
    });

    it("takes instance tokens, and drops a part's styles with unstyled", async () => {
        withRegistry(
            <GridList tokens={{ columns: 5 }} unstyled={{ tile: true }}>
                <GridList.Tile />
            </GridList>,
        );
        await settle();
        expect(byTestId(ids.tile).className).toBe("");
    });

    it("throws for a part outside Root, naming both", () => {
        quietly(() =>
            mount(
                <Errored>
                    <GridList.Tile />
                </Errored>,
            ),
        );
        expect(byTestId("error").textContent).toMatch(
            /<GridList.Tile> must be inside <GridList.Root>/,
        );
    });
});
