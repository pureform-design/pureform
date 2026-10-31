import { describe, expect, it } from "vitest";

import { legacyProviderKeyMessages } from "./legacy-provider-keys";

describe("legacyProviderKeyMessages", () => {
    it("says nothing for keys that are parts, and for no slot props", () => {
        expect(legacyProviderKeyMessages(undefined)).toEqual([]);
        expect(
            legacyProviderKeyMessages({
                button: { root: {}, label: {} },
                dialog: { content: {}, backdrop: {}, headline: {} },
                bottomSheet: { body: {}, content: {} },
            }).filter((message) => message.includes("button")),
        ).toEqual([]);
    });

    it("names the part a renamed slot's key moved to, keeping the wrapper in view", () => {
        const [message, ...rest] = legacyProviderKeyMessages({
            dialog: { root: { style: {} }, headline: {} },
        });
        expect(rest).toEqual([]);
        expect(message).toContain("slotProps.dialog.root");
        expect(message).toContain("slotProps.dialog.content");
        expect(message).toContain("unstyled wrapper");
    });

    it("warns for a sheet's `content`, which is now the surface, not the body", () => {
        const [message] = legacyProviderKeyMessages({
            sideSheet: { content: { style: {} } },
        });
        // `content` was the sheet's body slot; the part for the body is `body`.
        expect(message).toContain("slotProps.sideSheet.content");
        expect(message).toContain("slotProps.sideSheet.body");
    });

    it("reports each stale key once, across components", () => {
        const messages = legacyProviderKeyMessages({
            dialog: { root: {} },
            searchView: { root: {} },
            tabs: { root: {} },
            popover: { root: {}, content: {} },
        });
        expect(messages).toHaveLength(4);
        expect(messages.join("\n")).toContain("slotProps.searchView.surface");
        expect(messages.join("\n")).toContain("slotProps.tabs.list");
    });

    it("leaves out what a platform keeps its own meaning for, and drops the wrapper note without one", () => {
        const [message] = legacyProviderKeyMessages(
            { dialog: { root: {} }, tabs: { root: {} } },
            { wrapper: false, keeps: (component) => component === "tabs" },
        );
        expect(message).toContain("slotProps.dialog.content");
        expect(message).not.toContain("unstyled wrapper");
        expect(
            legacyProviderKeyMessages(
                { tabs: { root: {} } },
                { keeps: (component) => component === "tabs" },
            ),
        ).toEqual([]);
    });
});
