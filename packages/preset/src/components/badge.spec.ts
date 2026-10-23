import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { badge } from "./badge";
import { navigationBar } from "./navigation-bar";
import { navigationRail } from "./navigation-rail";
import { tabs } from "./tabs";

const compiled = () => compilePreset(configWith(badge)).theme?.recipes?.badge;
const slots = (component: Parameters<typeof configWith>[0], name: string) =>
    compilePreset(configWith(component)).theme?.slotRecipes?.[name]?.base;

describe("badge", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(badge)).not.toThrow();
    });

    it("is the error color, a dot at small and a labelled pill at large", () => {
        expect(compiled()?.base).toMatchObject({
            backgroundColor: expect.stringContaining(
                "components-badge-container",
            ),
        });
        expect(compiled()?.variants?.size?.small).toMatchObject({
            width: expect.stringContaining("smallSize"),
            height: expect.stringContaining("smallSize"),
        });
        expect(compiled()?.variants?.size?.large).toMatchObject({
            minWidth: expect.stringContaining("largeSize"),
            height: expect.stringContaining("largeSize"),
        });
    });

    it("flows inline unless anchored, then absolute at the top end corner", () => {
        // React Native alone takes `fit-content` (see the React Native badge spec): the web's
        // width stays `auto`, and its parent's alignment places it.
        expect(compiled()?.base).toMatchObject({ width: "auto" });
        expect(compiled()?.base).not.toHaveProperty("alignSelf");
        expect(compiled()?.variants?.placement?.flow ?? {}).toEqual({});
        expect(compiled()?.variants?.placement?.anchored).toMatchObject({
            position: "absolute",
        });
        expect(compiled()?.compoundVariants).toHaveLength(2);
    });

    it("compiles to a stable Panda recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});

describe("the parts a badge is anchored to", () => {
    it("are positioning contexts in the navigation bar, the rail and tabs", () => {
        for (const [component, name, part] of [
            [navigationBar, "navigationBar", "icon"],
            [navigationRail, "navigationRail", "icon"],
            [tabs, "tabs", "tabContent"],
        ] as const) {
            expect(
                (slots(component, name) as Record<string, unknown>)?.[part],
            ).toMatchObject({ position: "relative" });
        }
    });
});
