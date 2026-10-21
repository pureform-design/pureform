import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { card } from "./card";
import { touchTarget } from "./shared";

describe("card", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(card)).not.toThrow();
    });

    it("only gives interactive cards a state layer", () => {
        // The fill sets the container token; the static card's root reads it.
        expect(
            card.recipe.variants?.variant?.filled?.root?.tokens,
        ).toMatchObject({
            "components.card.container": {
                type: "alias",
                path: ["components", "card", "filledContainer"],
            },
        });
        const interactiveFilled = card.recipe.compoundVariants?.find(
            (c) =>
                c.match.interactive === "true" && c.match.variant === "filled",
        );
        expect(interactiveFilled?.style.root?.backgroundColor).toMatchObject({
            type: "conditional",
        });
    });

    it("compiles to a stable Panda slot recipe", () => {
        const preset = compilePreset(configWith(card));
        expect(preset.theme?.slotRecipes).toMatchSnapshot();
    });
});

describe("card touch target", () => {
    it("has a touch target slot styled like the buttons'", () => {
        expect(card.slots.slice(0, 2)).toEqual(["root", "touchTarget"]);
        expect(card.recipe.base.touchTarget).toBe(touchTarget);
    });
});

describe("card tokens", () => {
    it("falls back to the foundation radius when the var is unset", () => {
        const preset = compilePreset(configWith(card));
        expect(preset.theme?.slotRecipes?.card?.base?.root).toMatchObject({
            borderRadius: "var(--components-card-radius, token(radii.medium))",
        });
    });
});

describe("card anatomy", () => {
    it("has Material's sections, the action area first", () => {
        expect(card.slots).toEqual([
            "root",
            "touchTarget",
            "actionArea",
            "media",
            "header",
            "avatar",
            "headerText",
            "headline",
            "subhead",
            "headerAction",
            "content",
            "supportingText",
            "actions",
            "footer",
        ]);
    });

    it("tints, lifts, focuses, and dims the container from its action area", () => {
        const preset = compilePreset(configWith(card));
        const root = preset.theme?.slotRecipes?.card?.variants?.interactive
            ?.false?.root as Record<string, Record<string, string>>;
        const hover = ":has(> .card__actionArea:is(:hover, [data-pf-hover]))";
        expect(Object.keys(root.backgroundColor!)).toContain(`&${hover}`);
        expect(Object.keys(root.boxShadow!)).toContain(`&${hover}`);
        expect(root.outlineStyle).toEqual({
            base: "none",
            "&:has(> .card__actionArea:is(:focus-visible):is(:focus-visible))":
                "solid",
        });
        expect(
            Object.keys(root.color!).some((key) =>
                key.includes(":has(> .card__actionArea:is(:disabled"),
            ),
        ).toBe(true);
    });

    it("declares where the action area shows indication: the container, from its layer", () => {
        expect(card.indication).toEqual([
            {
                trigger: "root",
                surface: "root",
                centered: false,
                focus: "root",
            },
            {
                trigger: "actionArea",
                surface: "root",
                centered: false,
                focus: "root",
                layer: "actionArea",
            },
        ]);
    });

    it("lets the sections pad themselves, and aligns the actions", () => {
        expect(card.recipe.variants?.padded?.false?.root).toMatchObject({
            paddingBlockStart: { value: 0 },
            overflow: { value: "hidden" },
        });
        expect(card.recipe.defaultVariants).toMatchObject({
            padded: "true",
            actionsAlign: "end",
        });
    });
});
