import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { chip } from "./chip";

const compiled = () => compilePreset(configWith(chip)).theme?.slotRecipes?.chip;

describe("chip", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(chip)).not.toThrow();
    });

    it("fills a selected chip with the secondary container in every variant", () => {
        for (const variant of ["outlined", "elevated"]) {
            const root = compiled()?.variants?.variant?.[variant]
                ?.root as Record<string, unknown>;
            expect(
                JSON.stringify(
                    root?.[
                        "&:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]), [data-selected])"
                    ],
                ),
            ).toContain("components-chip-selectedContainer");
        }
    });

    it("tints the icon from the chip's selected and disabled states", () => {
        const icon = compiled()?.base?.icon as Record<
            string,
            Record<string, string>
        >;
        const keys = Object.keys(icon.color ?? {});
        expect(
            keys.some((k) =>
                k.startsWith(".chip__root:is([aria-selected=true]"),
            ),
        ).toBe(true);
        expect(keys.some((k) => k.startsWith(".chip__root:is(:disabled"))).toBe(
            true,
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(compiled()).toMatchSnapshot();
    });
});

describe("chip color", () => {
    it("colors a selected chip with its group's container", () => {
        const error = JSON.stringify(compiled()?.variants?.color?.error);
        expect(error).toContain(
            '"--components-chip-selectedContainer":"token(colors.errorContainer)"',
        );
        expect(error).toContain(
            '"--components-chip-selectedContent":"token(colors.onErrorContainer)"',
        );
    });
});
