import { describe, expect, it } from "vitest";

import { BUTTON_ROOT_PROPS, buttonSelection } from "./button";
import { ICON_BUTTON_ROOT_PROPS, iconButtonSelection } from "./icon-button";
import { PROGRESS_ROOT_PROPS, progressSelection } from "./progress";
import { SEARCH_BAR_ROOT_PROPS, searchBarSelection } from "./search-bar";
import { SEPARATOR_ROOT_PROPS, separatorSelection } from "./separator";
import { SLIDER_ROOT_PROPS, sliderSelection } from "./slider";
import { SWITCH_ROOT_PROPS, switchSelection } from "./switch";

// The variant groups the preset took from M3 Expressive, passed through by every binding.
describe("M3 Expressive variants", () => {
    it("select a button's corners, and its toggle colors once it toggles", () => {
        expect(buttonSelection({ corner: "square" })).toMatchObject({
            corner: "square",
            toggle: undefined,
        });
        expect(buttonSelection({ defaultSelected: true })).toMatchObject({
            toggle: true,
        });
        expect(BUTTON_ROOT_PROPS).toContain("corner");
    });

    it("select an icon button's width and corners", () => {
        expect(
            iconButtonSelection({ width: "wide", corner: "square" }),
        ).toMatchObject({ width: "wide", corner: "square" });
        expect(ICON_BUTTON_ROOT_PROPS).toEqual(
            expect.arrayContaining(["width", "corner"]),
        );
    });

    it("select the slider's handle and size, the switch's icons, and the progress track", () => {
        expect(
            sliderSelection({ handleShape: "round", size: "large" }, 40),
        ).toMatchObject({ handleShape: "round", size: "large" });
        expect(switchSelection({ icons: "both" })).toMatchObject({
            icons: "both",
        });
        expect(
            progressSelection<"linearProgress">({
                thickness: "thick",
                value: 4,
            }),
        ).toMatchObject({ thickness: "thick" });
        expect(SLIDER_ROOT_PROPS).toEqual(
            expect.arrayContaining(["handleShape", "size"]),
        );
        expect(SWITCH_ROOT_PROPS).toContain("icons");
        expect(PROGRESS_ROOT_PROPS).toContain("thickness");
    });

    it("select a vertical divider and a centered search bar", () => {
        expect(separatorSelection({ orientation: "vertical" })).toMatchObject({
            orientation: "vertical",
        });
        expect(searchBarSelection({ centered: true })).toMatchObject({
            centered: true,
        });
        expect(SEPARATOR_ROOT_PROPS).toContain("orientation");
        expect(SEARCH_BAR_ROOT_PROPS).toContain("centered");
    });
});
