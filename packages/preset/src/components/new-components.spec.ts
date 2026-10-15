import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { dialog } from "./dialog";
import { listItem } from "./list-item";
import { menu } from "./menu";
import { searchBar } from "./search-bar";
import { tabs } from "./tabs";

describe.each([
    ["listItem", listItem],
    ["menu", menu],
    ["tabs", tabs],
    ["dialog", dialog],
    ["searchBar", searchBar],
] as const)("%s", (name, spec) => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(spec)).not.toThrow();
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(spec)).theme?.slotRecipes?.[name],
        ).toMatchSnapshot();
    });
});

describe("rows", () => {
    const recipe = (name: string, spec: typeof listItem) =>
        JSON.stringify(
            compilePreset(configWith(spec)).theme?.slotRecipes?.[name],
        );

    it("color a menu item's parts from the item, a list item's from the root", () => {
        expect(recipe("menu", menu)).toContain(".menu__item:is(");
        expect(recipe("listItem", listItem)).toContain(".listItem__root:is(");
    });
});

describe("tabs", () => {
    it("shows the indicator only on the selected tab", () => {
        const css = compilePreset(configWith(tabs)).theme?.slotRecipes?.tabs;
        expect(JSON.stringify(css?.base?.indicator)).toContain(
            '.tabs__tab:is([aria-selected=true], [aria-pressed=true], [data-selected]) &":"1"',
        );
    });
});

describe("searchBar", () => {
    it("colors the placeholder through a raw rule", () => {
        const css = compilePreset(configWith(searchBar)).theme?.slotRecipes
            ?.searchBar;
        expect(css?.base?.input?.["&::placeholder"]).toEqual({
            color: "var(--components-searchBar-placeholderColor, token(colors.onSurfaceVariant))",
        });
    });
});
