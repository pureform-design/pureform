// An overflow toolbar keeps the elements that fit its parent and moves the rest into a menu, so
// its story gives it a parent too narrow for all four: with the canvas's whole width, or none
// (the story's own element shrink-wraps its content), every element fits or none does.

import type { Decorator } from "@storybook/html-vite";

import { frame } from "./stage";

const narrow = frame({ width: "168px" });

export const decorators: Decorator[] = [
    (story, context) =>
        context.args["overflow"] === true
            ? narrow(story, context)
            : (story() as HTMLElement),
];
