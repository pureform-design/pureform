import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { LinearProgress } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { CircularProgress } from "../circular-progress";
import { mount, settle } from "../testing/render";

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

describe("LinearProgress", () => {
    it("is a progressbar with its value, which sets the token", async () => {
        withRegistry(
            <LinearProgress aria-label="Uploading" value={3} min={1} max={5} />,
        );
        await settle();
        const root = byTestId(testIds.linearProgress.root);
        expect(root.getAttribute("role")).toBe("progressbar");
        expect(root.getAttribute("aria-valuenow")).toBe("3");
        expect(root.getAttribute("aria-valuemin")).toBe("1");
        expect(root.getAttribute("aria-valuemax")).toBe("5");
        expect(root.style.getPropertyValue("--value")).toBe("50");
        expect(root.className).toBe(
            "linear-progress linear-progress--indeterminate-false",
        );
        expect(byTestId(testIds.linearProgress.indicator).parentElement).toBe(
            root,
        );
        expect(
            [...root.children].map((part) => part.getAttribute("data-pf-part")),
        ).toEqual(["track", "indicator", "stop-indicator"]);
    });

    it("is indeterminate without a value", async () => {
        withRegistry(<LinearProgress aria-label="Loading" />);
        await settle();
        const root = byTestId(testIds.linearProgress.root);
        expect(root.hasAttribute("aria-valuenow")).toBe(false);
        expect(root.className).toContain("linear-progress--indeterminate-true");
        expect(root.style.getPropertyValue("--value")).toBe("");
    });
});

describe("CircularProgress", () => {
    it("renders each half around its arc", async () => {
        withRegistry(<CircularProgress aria-label="Loading" value={75} />);
        await settle();
        const ids = testIds.circularProgress;
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-valuenow")).toBe("75");
        expect(
            [...root.children].map((part) => part.getAttribute("data-pf-part")),
        ).toEqual(["track", "end-half", "start-half", "tail-cap", "head-cap"]);
        const track = byTestId(ids.track);
        expect(
            [...track.children].map((part) =>
                part.getAttribute("data-pf-part"),
            ),
        ).toEqual([
            "track-end-half",
            "track-start-half",
            "track-tail-cap",
            "track-head-cap",
        ]);
        expect(byTestId(ids.trackEndArc).parentElement).toBe(
            byTestId(ids.trackEndHalf),
        );
        expect(byTestId(ids.trackStartArc).parentElement).toBe(
            byTestId(ids.trackStartHalf),
        );
        expect(byTestId(ids.endArc).parentElement).toBe(byTestId(ids.endHalf));
        expect(byTestId(ids.startArc).parentElement).toBe(
            byTestId(ids.startHalf),
        );
    });
});

describe("the progress indicators' track", () => {
    const parts = (id: string) =>
        [...byTestId(id).children].map((part) =>
            part.getAttribute("data-pf-part"),
        );

    it("draws the track by default, determinate and indeterminate, flat and wavy", async () => {
        withRegistry(
            <>
                <LinearProgress testId="a" value={40} />
                <LinearProgress testId="b" shape="wavy" />
                <CircularProgress testId="c" value={40} shape="wavy" />
                <CircularProgress testId="d" />
            </>,
        );
        await settle();
        expect(parts("a-root")).toEqual([
            "track",
            "indicator",
            "stop-indicator",
        ]);
        expect(parts("b-root")).toEqual([
            "track",
            "indicator",
            "stop-indicator",
        ]);
        expect(parts("c-root")).toEqual([
            "track",
            "end-half",
            "start-half",
            "tail-cap",
            "head-cap",
        ]);
        expect(parts("d-root")).toEqual([
            "track",
            "end-half",
            "start-half",
            "tail-cap",
            "head-cap",
        ]);
    });

    it("leaves the track and the stop dot out with track={false}", async () => {
        withRegistry(
            <>
                <LinearProgress testId="a" value={40} track={false} />
                <LinearProgress testId="b" track={false} />
                <CircularProgress testId="c" value={40} track={false} />
                <CircularProgress testId="d" shape="wavy" track={false} />
            </>,
        );
        await settle();
        expect(parts("a-root")).toEqual(["indicator"]);
        expect(parts("b-root")).toEqual(["indicator"]);
        const indicator = ["end-half", "start-half", "tail-cap", "head-cap"];
        expect(parts("c-root")).toEqual(indicator);
        expect(parts("d-root")).toEqual(indicator);
        expect(byTestId("a-root").hasAttribute("track")).toBe(false);
    });
});
