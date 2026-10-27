import * as core from "@pureform/binding-core";
import type { PartStates } from "@pureform/binding-core";
import type { AttributeState } from "@pureform/web-contracts";
import { describe, expect, expectTypeOf, it } from "vitest";

import * as web from ".";

describe("platform projections", () => {
    it("encodes exactly the states binding-core lets a part mark", () => {
        expectTypeOf<keyof PartStates>().toEqualTypeOf<AttributeState>();
    });

    it("keeps representative extracted exports off the portable runtime", () => {
        for (const name of [
            "cardElement",
            "fieldControlProps",
            "fieldLabelProps",
            "radioInputProps",
            "radioItemProps",
            "paginatorTriggerProps",
            "pageRootProps",
            "nativeSelectProps",
            "selectHiddenSelectProps",
            "selectValueProps",
            "buttonMachineProps",
            "fabMenuMachineProps",
            "selectionListMachineProps",
            "searchViewDialogProps",
            "CARET_STYLE",
            "COPY_ANNOUNCEMENT_STYLE",
            "SEARCH_VIEW_ROOT_STYLE",
            "SEARCH_VIEW_TRIGGER_STYLE",
            "unstyledToolbarProvidedTokens",
            "carouselInitialStyle",
            "checkboxNativeDefault",
            "sliderNativeDefault",
        ]) {
            expect(core, name).not.toHaveProperty(name);
            expect(web, name).toHaveProperty(name);
        }
    });
    it("retains web icon and CSS layout fallbacks", () => {
        expect(web.DEFAULT_ICON_STYLE).toEqual({
            size: undefined,
            color: "currentColor",
            filled: false,
        });
        expect(web.carouselInitialStyle("hero", 240)).toBe("240px");
        expect(web.carouselInitialStyle("fullScreen")).toBe("100%");
        expect(web.toasterOptions({ offsets: undefined }).offsets).toBe("16px");
        expect(web.toasterOptions({ offsets: "2rem" }).offsets).toBe("2rem");
        expect(
            web.unstyledToolbarProvidedTokens({ color: "vibrant" }, {}),
        ).toEqual({
            iconButton: {
                accent: "var(--components-toolbar-content, currentColor)",
            },
        });
        expect(web.unstyledToolbarProvidedTokens({}, {})).toBeUndefined();
    });
});
