import { fadeThroughPageProps } from "@pureform/binding-web";
import { describe, expect, it } from "vitest";

describe("fade through pages", () => {
    it("marks entering and leaving pages, and none for the first", () => {
        expect(
            fadeThroughPageProps({
                key: "home",
                state: "leaving",
                direction: undefined,
            }),
        ).toEqual({
            "data-state": "closed",
            "aria-hidden": "true",
            inert: true,
        });
        expect(
            fadeThroughPageProps({
                key: "mail",
                state: "entering",
                direction: undefined,
            }),
        ).toEqual({ "data-state": "open" });
        expect(
            fadeThroughPageProps({
                key: "home",
                state: "current",
                direction: undefined,
            }),
        ).toEqual({});
    });
});
