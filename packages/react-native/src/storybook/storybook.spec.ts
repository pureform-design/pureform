import { describe, expect, it } from "vitest";

import { args, storyEngine } from ".";
import { animated } from "../engine";
import { reanimated } from "../engines/reanimated";
import { reanimatedSvg } from "../engines/reanimated-svg";
import { animatedSvg } from "../engines/svg";

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

describe("the stories' engine", () => {
    it("follows the toolbar's engine, Animated with SVG by default", () => {
        expect(storyEngine({}).name).toBe(animatedSvg.name);
        expect(storyEngine({ engine: "animated" }).name).toBe(animated.name);
        expect(storyEngine({ engine: "svg" }).name).toBe(animatedSvg.name);
        expect(storyEngine({ engine: "reanimated" }).name).toBe(
            reanimated.name,
        );
        expect(storyEngine({ engine: "reanimated-svg" }).name).toBe(
            reanimatedSvg.name,
        );
        expect(storyEngine({ engine: "unknown" }).name).toBe(animatedSvg.name);
    });
});
