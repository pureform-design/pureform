// The plain Textarea alone: its element and the theme's box. Its text is specified with Input's.

import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { Textarea } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

describe("Textarea", () => {
    it("renders a textarea with its value", async () => {
        mount(() => (
            <PureformProvider registry={displayRegistry()}>
                <Textarea aria-label="Bio" defaultValue="Hi" invalid />
            </PureformProvider>
        ));
        await settle();
        const textarea = byTestId<HTMLTextAreaElement>(
            testIds.plainTextarea.root,
        );
        expect(textarea.localName).toBe("textarea");
        expect(textarea.value).toBe("Hi");
        expect(textarea.getAttribute("aria-invalid")).toBe("true");
    });
});
