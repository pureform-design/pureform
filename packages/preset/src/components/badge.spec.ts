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

    it("flows at its own size unless anchored, then absolute at the top end corner", () => {
        // Not stretched across a flex column, such as any React Native view.
        expect(compiled()?.variants?.placement?.flow).toEqual({
            alignSelf: "start",
        });
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
