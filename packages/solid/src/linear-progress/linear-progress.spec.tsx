import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { LinearProgress } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { CircularProgress } from "../circular-progress";
import { byTestId, mount, settle } from "../testing/mount";

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("LinearProgress", () => {
    it("is a progressbar with its value, which sets the token", async () => {
        withRegistry(() => (
            <LinearProgress aria-label="Uploading" value={3} min={1} max={5} />
        ));
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
    });

    it("is indeterminate without a value", async () => {
        withRegistry(() => <LinearProgress aria-label="Loading" />);
        await settle();
        const root = byTestId(testIds.linearProgress.root);
        expect(root.hasAttribute("aria-valuenow")).toBe(false);
        expect(root.className).toContain("linear-progress--indeterminate-true");
        expect(root.style.getPropertyValue("--value")).toBe("");
    });
});

describe("CircularProgress", () => {
    it("renders each half around its arc", async () => {
        withRegistry(() => (
            <CircularProgress aria-label="Loading" value={75} />
        ));
        await settle();
        const ids = testIds.circularProgress;
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-valuenow")).toBe("75");
        expect(
            [...root.children].map((part) => part.getAttribute("data-pf-part")),
        ).toEqual(["end-half", "start-half"]);
        expect(byTestId(ids.endArc).parentElement).toBe(byTestId(ids.endHalf));
        expect(byTestId(ids.startArc).parentElement).toBe(
            byTestId(ids.startHalf),
        );
    });
});
