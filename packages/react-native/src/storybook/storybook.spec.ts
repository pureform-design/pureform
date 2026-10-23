import { describe, expect, it } from "vitest";

import { args } from ".";

describe("the stories' args", () => {
    it("press through onPress, and take the web's body as children", () => {
        const onClick = () => {};
        expect(args({ onClick, body: "Send it", modal: true })).toEqual({
            onPress: onClick,
            body: "Send it",
            children: "Send it",
            modal: true,
        });
        expect(args({ body: "Body", children: "Own" })).toEqual({
            body: "Body",
            children: "Own",
        });
    });
});
