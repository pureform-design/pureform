import { testIds } from "@pureform/anatomy";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Rating } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount } from "../testing/render";

const ids = testIds.rating;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["rating"]);
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("Rating on React Native", () => {
    it("renders a labelled radio group with a radio per star and the filled stars the value reaches", async () => {
        await withRegistry(<Rating label="Quality" defaultValue={2} />);
        expect(byTestId(ids.control).getAttribute("role")).toBe("radiogroup");
        expect(byTestId(ids.label).textContent).toBe("Quality");
        const items = all(ids.item);
        expect(items).toHaveLength(5);
        expect(items[0]?.getAttribute("role")).toBe("radio");
        expect(items[1]?.getAttribute("aria-checked")).toBe("true");
        expect(all(ids.fill)).toHaveLength(2);
        expect(all(ids.halfFill)).toHaveLength(0);
    });

    it("draws a half star for a half value", async () => {
        await withRegistry(<Rating allowHalf defaultValue={2.5} />);
        expect(all(ids.fill)).toHaveLength(2);
        expect(all(ids.halfFill)).toHaveLength(1);
    });

    it("sets the value by a press, and takes none while read-only", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", number>) => void>();
        await withRegistry(
            <>
                <Rating testId="live" count={4} onValueChange={onValueChange} />
                <Rating testId="shown" readOnly defaultValue={1} />
            </>,
        );
        await interact(() =>
            userEvent.click(all("live-item")[2] as HTMLElement),
        );
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 3 });
        expect(all("live-fill")).toHaveLength(3);
        // A read-only star can't be pressed.
        expect(all("shown-item")[3]?.getAttribute("aria-disabled")).toBe(
            "true",
        );
        expect(all("shown-fill")).toHaveLength(1);
    });

    it("takes a function of each star in a repeated part's style and slotProps", async () => {
        const seen: number[] = [];
        await withRegistry(
            <Rating
                defaultValue={2}
                count={3}
                style={{
                    item: (star) => {
                        seen.push(star.index);
                        return star.fill === "full"
                            ? { opacity: 0.5 }
                            : undefined;
                    },
                }}
                slotProps={{
                    item: (star) => ({
                        accessibilityHint: `star ${star.index}`,
                    }),
                }}
            />,
        );
        const stars = all(ids.item);
        expect(stars.map((each) => getComputedStyle(each).opacity)).toEqual([
            "0.5",
            "0.5",
            "1",
        ]);
        expect(seen.slice(0, 3)).toEqual([1, 2, 3]);
    });
});
