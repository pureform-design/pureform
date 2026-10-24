import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { PureformProvider } from ".";
import { CircularProgress } from "./circular-progress";
import { LinearProgress } from "./linear-progress";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { mount, settle } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["linearProgress", "circularProgress"]);
});

const render = async (node: ReactNode) => {
    await mount(
        <PureformProvider registry={registry}>{node}</PureformProvider>,
    );
    await settle(50);
};

const has = (id: string) =>
    document.querySelector(`[data-testid="${id}"]`) !== null;

describe("the progress indicators' track", () => {
    it("draws the track by default, determinate and indeterminate, flat and wavy", async () => {
        await render(
            <>
                <LinearProgress testId="a" value={40} />
                <LinearProgress testId="b" shape="wavy" />
                <CircularProgress testId="c" value={40} shape="wavy" />
                <CircularProgress testId="d" />
            </>,
        );
        for (const id of ["a", "b", "c", "d"]) {
            expect(has(`${id}-track`)).toBe(true);
            expect(has(`${id}-indicator`) || has(`${id}-end-half`)).toBe(true);
        }
    });

    it("leaves the track out with track={false}", async () => {
        await render(
            <>
                <LinearProgress testId="a" value={40} track={false} />
                <LinearProgress testId="b" track={false} />
                <CircularProgress testId="c" value={40} track={false} />
                <CircularProgress testId="d" track={false} />
            </>,
        );
        for (const id of ["a", "b", "c", "d"])
            expect(has(`${id}-track`)).toBe(false);
        expect(has("a-indicator")).toBe(true);
        expect(has("a-stop-indicator")).toBe(true);
        expect(has("d-end-arc")).toBe(true);
    });
});
