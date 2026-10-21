import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { LoadingIndicator } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { CircularProgress } from "../circular-progress";
import { LinearProgress } from "../linear-progress";
import { byTestId, mount, settle } from "../testing/mount";

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("LoadingIndicator", () => {
    it("is a progressbar with no value, around its container and indicator", async () => {
        withRegistry(() => <LoadingIndicator aria-label="Loading" />);
        await settle();
        const ids = testIds.loadingIndicator;
        const root = byTestId(ids.root);
        expect(root.getAttribute("role")).toBe("progressbar");
        expect(root.getAttribute("aria-label")).toBe("Loading");
        expect(root.hasAttribute("aria-valuenow")).toBe(false);
        expect(byTestId(ids.container).parentElement).toBe(root);
        expect(byTestId(ids.indicator).parentElement).toBe(
            byTestId(ids.container),
        );
        expect(root.className).toBe("loading-indicator");
    });

    it("passes its variant and color", async () => {
        withRegistry(() => (
            <LoadingIndicator
                aria-label="Loading"
                variant="contained"
                color="tertiary"
            />
        ));
        await settle();
        expect(byTestId(testIds.loadingIndicator.root).className).toBe(
            "loading-indicator loading-indicator--variant-contained loading-indicator--color-tertiary",
        );
    });

    it("composes from its parts", async () => {
        withRegistry(() => (
            <LoadingIndicator.Root aria-label="Loading" testId="wait">
                <LoadingIndicator.Container>
                    <LoadingIndicator.Indicator />
                </LoadingIndicator.Container>
            </LoadingIndicator.Root>
        ));
        await settle();
        expect(byTestId("wait-indicator").getAttribute("data-pf-part")).toBe(
            "indicator",
        );
    });
});

describe("wavy progress", () => {
    it("passes shape to both progress indicators", async () => {
        withRegistry(() => (
            <>
                <LinearProgress aria-label="Up" value={40} shape="wavy" />
                <CircularProgress aria-label="Down" value={40} shape="wavy" />
            </>
        ));
        await settle();
        expect(byTestId(testIds.linearProgress.root).className).toContain(
            "linear-progress--shape-wavy",
        );
        expect(byTestId(testIds.circularProgress.root).className).toContain(
            "circular-progress--shape-wavy",
        );
    });
});
