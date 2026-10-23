import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Rating } from ".";
import { PureformProvider } from "..";
import { ratingRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.rating;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={ratingRegistry()}>{view}</PureformProvider>,
    );

const items = () => [
    ...document.querySelectorAll(`[data-testid="${ids.item}"]`),
];
const count = (part: string) =>
    document.querySelectorAll(`[data-testid="${part}"]`).length;

describe("Rating, ready-made", () => {
    it("renders a radiogroup of stars, labelled, in the anatomy's structure", async () => {
        withRegistry(
            <Rating label="Quality" defaultValue={2} color="tertiary" />,
        );
        await settle();
        expect(byTestId(ids.root).className).toBe(
            "rating rating--color-tertiary",
        );
        const control = byTestId(ids.control);
        expect(control.getAttribute("role")).toBe("radiogroup");
        expect(control.getAttribute("aria-labelledby")).toBe(
            byTestId(ids.label).id,
        );
        expect(items()).toHaveLength(5);
        expect(items()[0]?.getAttribute("role")).toBe("radio");
        expect(items()[1]?.getAttribute("aria-checked")).toBe("true");
        expect(count(ids.icon)).toBe(5);
        expect(count(ids.fill)).toBe(2);
        expect(count(ids.halfFill)).toBe(0);
    });

    it("fills a half star with the half part when allowHalf and the value has one", async () => {
        withRegistry(<Rating allowHalf defaultValue={2.5} />);
        await settle();
        expect(count(ids.fill)).toBe(2);
        expect(count(ids.halfFill)).toBe(1);
    });

    it("sets the value by pressing a star and by the arrow keys, and reports it", async () => {
        const onValueChange = vi.fn();
        withRegistry(<Rating onValueChange={onValueChange} count={4} />);
        await settle();
        await userEvent.click(items()[2] as HTMLElement);
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 3 });
        expect(count(ids.fill)).toBe(3);
        // Zag takes the arrow keys while the pointer is off the group.
        await userEvent.unhover(items()[2] as HTMLElement);
        (items()[2] as HTMLElement).focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 4 });
        expect(count(ids.fill)).toBe(4);
        expect(items()).toHaveLength(4);
    });

    it("takes no input while read-only or disabled", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <Rating readOnly defaultValue={1} onValueChange={onValueChange} />,
        );
        await settle();
        await userEvent.click(items()[3] as HTMLElement);
        expect(onValueChange).not.toHaveBeenCalled();
        expect(count(ids.fill)).toBe(1);
    });

    it("follows a controlled value and submits it in a hidden input", async () => {
        withRegistry(<Rating value={3} name="quality" />);
        await settle();
        expect(count(ids.fill)).toBe(3);
        const input = document.querySelector<HTMLInputElement>(
            'input[name="quality"]',
        );
        expect(input?.value).toBe("3");
    });
});
