import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TagsInput } from ".";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.tagsInput;
const chipIds = testIds.inputChip;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={textInputsRegistry()}>
            {view}
        </PureformProvider>,
    );

const parts = (root: Element) =>
    [...root.querySelectorAll("[data-pf-part]")].map((part) =>
        part.getAttribute("data-pf-part"),
    );

const chips = () =>
    [...document.querySelectorAll(`[data-testid="${chipIds.root}"]`)].map(
        (chip) =>
            chip.querySelector(`[data-testid="${chipIds.label}"]`)?.textContent,
    );

describe("TagsInput, ready-made", () => {
    it("renders the field in the anatomy's structure, with a chip per value", async () => {
        withRegistry(
            <TagsInput
                label="Tags"
                variant="outlined"
                defaultValue={["red", "blue"]}
                chip={{ corner: "round" }}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe("tags-input tags-input--variant-outlined");
        expect(parts(root)).toEqual([
            "container",
            "root",
            "touch-target",
            "label",
            "remove",
            "root",
            "touch-target",
            "label",
            "remove",
            "input",
            "label",
        ]);
        expect(chips()).toEqual(["red", "blue"]);
        const chip = document.querySelector(`[data-testid="${chipIds.root}"]`)!;
        expect(chip.className).toBe("input-chip input-chip--corner-round");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.labels?.[0]).toBe(byTestId(ids.label));
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            true,
        );
    });

    it("adds typed text on Enter, and removes a chip with its button", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <TagsInput
                label="Tags"
                defaultValue={["red"]}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await userEvent.click(input);
        await userEvent.type(input, "blue{Enter}");
        await settle();
        expect(chips()).toEqual(["red", "blue"]);
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: ["red", "blue"] }),
        );
        const remove = document.querySelector<HTMLButtonElement>(
            `[data-testid="${chipIds.remove}"]`,
        )!;
        expect(remove.getAttribute("aria-label")).toContain("red");
        await userEvent.click(remove);
        await settle();
        expect(chips()).toEqual(["blue"]);
    });

    it("follows a controlled value", async () => {
        const handle = { set: (_value: string[]) => {} };
        function Controlled(): ReactNode {
            const [value, setValue] = useState(["a"]);
            handle.set = setValue;
            return <TagsInput label="Tags" value={value} />;
        }
        withRegistry(<Controlled />);
        await settle();
        expect(chips()).toEqual(["a"]);
        handle.set(["a", "b"]);
        await settle();
        expect(chips()).toEqual(["a", "b"]);
    });

    it("hovers the chip Backspace highlights", async () => {
        withRegistry(<TagsInput label="Tags" defaultValue={["a", "b"]} />);
        await settle();
        await userEvent.click(byTestId(ids.input));
        await userEvent.keyboard("{Backspace}");
        await settle();
        const [first, second] = document.querySelectorAll(
            `[data-testid="${chipIds.root}"]`,
        );
        expect(second!.hasAttribute("data-pf-hover")).toBe(true);
        expect(first!.hasAttribute("data-pf-hover")).toBe(false);
    });

    it("renders avatars or icons, the supporting text, and an error in its place", async () => {
        withRegistry(
            <TagsInput
                label="To"
                defaultValue={["ada"]}
                chipAvatar={(value) => value[0]}
                supportingText="Press Enter"
                error="Too many"
                name="to"
            />,
        );
        await settle();
        expect(byTestId(chipIds.avatar).textContent).toBe("a");
        expect(byTestId(ids.supportingText).textContent).toBe("Too many");
        expect(byTestId(ids.input).getAttribute("aria-invalid")).toBe("true");
        const hidden =
            document.querySelector<HTMLInputElement>('input[name="to"]')!;
        expect(hidden.value).toBe("ada");
    });

    it("prefixes the chips' test ids from Root's", async () => {
        withRegistry(
            <TagsInput label="Tags" testId="tags" defaultValue={["a"]} />,
        );
        await settle();
        expect(byTestId("tags-input")).toBeTruthy();
        expect(byTestId("tags-chip-label").textContent).toBe("a");
    });
});
