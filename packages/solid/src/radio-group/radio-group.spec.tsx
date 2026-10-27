import { compositeTestIds, testIds } from "@pureform/anatomy";
import { Errored } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { RadioGroup } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.radio;

// The preset's layout, enough for real clicks: each input stretched invisibly over its radio.
const layout = `
    [data-scope="radio"][data-pf-part="root"] { position: relative; display: inline-flex; width: 40px; height: 40px; }
    [data-scope="radio"][data-pf-part="input"] { position: absolute; inset: 0; margin: 0; opacity: 0; }
`;

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium", testId: "medium" },
];

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={togglesRegistry()}>
            <style>{layout}</style>
            {view() as never}
        </PureformProvider>
    ));

const inputs = () => [
    ...document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
];

describe("RadioGroup, ready-made", () => {
    it("renders an unstyled radiogroup holding a radio per item", async () => {
        withRegistry(() => (
            <RadioGroup
                aria-label="Size"
                name="size"
                color="error"
                items={ITEMS}
                class={{ root: "sizes" }}
            />
        ));
        await settle();
        const group = byTestId(compositeTestIds.radioGroup.root);
        expect(group.tagName).toBe("DIV");
        expect(group.getAttribute("role")).toBe("radiogroup");
        expect(group.getAttribute("data-scope")).toBe("radio-group");
        expect(group.getAttribute("aria-label")).toBe("Size");
        expect(group.hasAttribute("aria-labelledby")).toBe(false);
        expect(group.getAttribute("style")).toBeNull();
        expect(group.className).toBe("sizes");
        const roots = group.querySelectorAll(`[data-pf-part="root"]`);
        expect(roots).toHaveLength(2);
        expect(roots[0]!.tagName).toBe("LABEL");
        expect(roots[0]!.className).toBe("radio radio--color-error");
        expect(
            [...roots[0]!.querySelectorAll("[data-pf-part]")].map((part) =>
                part.getAttribute("data-pf-part"),
            ),
        ).toEqual(["touch-target", "input", "ring", "dot"]);
        expect(inputs().map((input) => input.name)).toEqual(["size", "size"]);
        expect(
            inputs().map((input) => input.getAttribute("aria-label")),
        ).toEqual(["Small", "Medium"]);
        expect(inputs()[0]!.getAttribute("style")).toBeNull();
        expect(inputs()[0]!.hasAttribute("aria-labelledby")).toBe(false);
        expect(byTestId(ids.ring).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId("medium-input")).toBe(inputs()[1]);
    });

    it("checks a radio on a click, reporting the change once", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
        withRegistry(() => (
            <RadioGroup
                aria-label="Size"
                items={ITEMS}
                defaultValue="s"
                onValueChange={onValueChange}
            />
        ));
        await settle();
        await userEvent.click(inputs()[1]!);
        await settle();
        expect(inputs().map((input) => input.checked)).toEqual([false, true]);
        expect(onValueChange.mock.calls).toEqual([[{ value: "m" }]]);
    });

    it("gives a radio's variants precedence over the group's", async () => {
        withRegistry(() => (
            <RadioGroup.Root aria-label="Size" color="error">
                <RadioGroup.Item value="s" color="primary">
                    <RadioGroup.ItemInput aria-label="Small" />
                </RadioGroup.Item>
            </RadioGroup.Root>
        ));
        await settle();
        expect(byTestId(ids.root).className).toBe("radio radio--color-primary");
    });

    it("throws for a radio's part outside its Item, naming both", () => {
        mount(() => (
            <PureformProvider registry={togglesRegistry()}>
                <Errored
                    fallback={(error) => (
                        <p data-testid="error">{String(error())}</p>
                    )}
                >
                    <RadioGroup.Root aria-label="Size">
                        <RadioGroup.ItemDot />
                    </RadioGroup.Root>
                </Errored>
            </PureformProvider>
        ));
        expect(byTestId("error").textContent).toMatch(
            /<RadioGroup.ItemDot> must be inside <RadioGroup.Item>/,
        );
    });
});

describe("RadioGroup, radioProps", () => {
    it("gives every radio radioProps, an item's own testId winning", async () => {
        withRegistry(() => (
            <RadioGroup
                aria-label="Size"
                name="size"
                items={[
                    { value: "s", label: "Small" },
                    { value: "m", label: "Medium", testId: "own" },
                ]}
                radioProps={{ class: { dot: "big" }, testId: "r" }}
            />
        ));
        await settle();
        expect(byTestId("r-dot").className).toContain("big");
        expect(byTestId("own-dot").className).toContain("big");
    });
});
