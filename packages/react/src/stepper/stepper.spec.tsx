import { testIds } from "@pureform/anatomy";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Stepper } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = (id: string): HTMLElement => {
    const element = document.querySelector<HTMLElement>(
        `[data-testid="${id}"]`,
    );
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

const ids = testIds.stepper;

const ITEMS = [
    { label: "Address", content: "Address form" },
    { label: "Payment", caption: "Optional", content: "Payment form" },
    { label: "Review", icon: "★", content: "Review" },
];

const render = (
    props: Record<string, unknown> = {},
    dir: "ltr" | "rtl" = "ltr",
) =>
    mount(
        <PureformProvider registry={displayRegistry()} dir={dir}>
            <Stepper aria-label="Checkout" items={ITEMS} {...props} />
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];
const triggers = () => all(ids.trigger) as HTMLButtonElement[];

afterEach(() => {
    document.body.innerHTML = "";
});

describe("Stepper, ready-made", () => {
    it("renders a list of steps, each with a header and a connector, and the current content after the list", async () => {
        render({ orientation: "horizontal" });
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toContain("stepper--orientation-horizontal");
        const list = byTestId(ids.list);
        expect(list.getAttribute("role")).toBe("tablist");
        expect(list.getAttribute("aria-label")).toBe("Checkout");
        expect(all(ids.item)).toHaveLength(3);
        // The last step has no connector.
        expect(all(ids.separator)).toHaveLength(2);
        expect(
            all(ids.trigger).map((trigger) =>
                trigger.getAttribute("aria-selected"),
            ),
        ).toEqual(["true", "false", "false"]);
        expect(all(ids.item)[0]!.getAttribute("role")).toBe("presentation");
        expect(all(ids.indicator).map((part) => part.textContent)).toEqual([
            "1",
            "2",
            "★",
        ]);
        expect(all(ids.caption).map((part) => part.textContent)).toEqual([
            "Optional",
        ]);
        const contents = all(ids.content);
        expect(contents.map((part) => part.hidden)).toEqual([
            false,
            true,
            true,
        ]);
        // A row's content follows the list, outside the items.
        expect(contents[0]!.parentElement).toBe(root);
        expect(triggers()[0]!.getAttribute("aria-controls")).toBe(
            contents[0]!.id,
        );
        expect(
            all(ids.indicator).every(
                (part) => part.getAttribute("aria-hidden") === "true",
            ),
        ).toBe(true);
    });

    it("puts each step's content in its item in a column", async () => {
        render({ orientation: "vertical" });
        await settle();
        expect(byTestId(ids.root).className).toContain(
            "stepper--orientation-vertical",
        );
        const contents = all(ids.content);
        expect(contents[0]!.parentElement).toBe(all(ids.item)[0]);
        expect(contents[2]!.parentElement).toBe(all(ids.item)[2]);
    });

    it("shows a check for a done step and a warning for one in error, and marks the header", async () => {
        render({ defaultStep: 1 }, "ltr");
        await settle();
        const indicators = all(ids.indicator);
        expect(indicators[0]!.querySelector("svg")).not.toBeNull();
        expect(indicators[0]!.getAttribute("aria-checked")).toBe("true");
        expect(indicators[1]!.textContent).toBe("2");
        document.body.innerHTML = "";
        render({
            items: [
                { label: "A" },
                { label: "B", error: true },
                { label: "C", editable: false },
            ],
            defaultStep: 3,
        });
        await settle();
        expect(triggers()[1]!.getAttribute("aria-invalid")).toBe("true");
        expect(all(ids.indicator)[1]!.querySelector("svg")).not.toBeNull();
        expect(triggers()[2]!.disabled).toBe(true);
        expect(triggers()[0]!.disabled).toBe(false);
    });

    it("goes to a step with a click, and reports it", async () => {
        const onStepChange = vi.fn();
        render({ onStepChange });
        await settle();
        await userEvent.click(triggers()[2]!);
        await settle();
        expect(onStepChange).toHaveBeenCalledWith(
            expect.objectContaining({ step: 2 }),
        );
        expect(all(ids.content).map((part) => part.hidden)).toEqual([
            true,
            true,
            false,
        ]);
        expect(triggers()[2]!.tabIndex).toBe(0);
        expect(triggers()[0]!.tabIndex).toBe(-1);
    });

    it("moves focus with the arrow keys, by direction, and goes to the focused step with Enter", async () => {
        render({}, "rtl");
        await settle();
        triggers()[0]!.focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(document.activeElement).toBe(triggers()[1]);
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(triggers()[1]!.getAttribute("aria-selected")).toBe("true");
    });

    it("keeps the headers from going to a step in linear mode", async () => {
        render({ linear: true });
        await settle();
        await userEvent.click(triggers()[2]!);
        await settle();
        expect(triggers()[0]!.getAttribute("aria-selected")).toBe("true");
    });

    it("takes the step as a controlled value", async () => {
        render({ step: 2 });
        await settle();
        expect(triggers()[2]!.getAttribute("aria-selected")).toBe("true");
        await userEvent.click(triggers()[0]!);
        await settle();
        expect(triggers()[2]!.getAttribute("aria-selected")).toBe("true");
    });
});

describe("Stepper, composed", () => {
    it("renders the parts under Root, with next and previous triggers", async () => {
        const onStepComplete = vi.fn();
        mount(
            <PureformProvider registry={displayRegistry()}>
                <Stepper.Root count={2} onStepComplete={onStepComplete}>
                    <Stepper.List aria-label="Steps">
                        <Stepper.Item index={0}>
                            <Stepper.Trigger>
                                <Stepper.Indicator>1</Stepper.Indicator>
                                <Stepper.Label>One</Stepper.Label>
                            </Stepper.Trigger>
                            <Stepper.Separator />
                        </Stepper.Item>
                        <Stepper.Item index={1}>
                            <Stepper.Trigger>
                                <Stepper.Indicator>2</Stepper.Indicator>
                                <Stepper.Label>Two</Stepper.Label>
                            </Stepper.Trigger>
                        </Stepper.Item>
                    </Stepper.List>
                    <Stepper.Content index={0}>First</Stepper.Content>
                    <Stepper.Content index={1}>Second</Stepper.Content>
                    <Stepper.PrevTrigger>Back</Stepper.PrevTrigger>
                    <Stepper.NextTrigger>Next</Stepper.NextTrigger>
                </Stepper.Root>
            </PureformProvider>,
        );
        await settle();
        const buttons = [...document.querySelectorAll("button")].filter(
            (button) => !button.hasAttribute("role"),
        ) as HTMLButtonElement[];
        const [back, next] = buttons;
        expect(back!.disabled).toBe(true);
        await userEvent.click(next!);
        await settle();
        expect(triggers()[1]!.getAttribute("aria-selected")).toBe("true");
        expect(back!.disabled).toBe(false);
        await userEvent.click(next!);
        await settle();
        expect(onStepComplete).toHaveBeenCalledOnce();
        expect(next!.disabled).toBe(true);
        expect(all(ids.indicator)[1]!.getAttribute("aria-checked")).toBe(
            "true",
        );
    });

    it("throws for a part outside Root or its item", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() =>
            mount(
                <PureformProvider registry={displayRegistry()}>
                    <Stepper.Root count={1}>
                        <Stepper.Indicator>Stray</Stepper.Indicator>
                    </Stepper.Root>
                </PureformProvider>,
            ),
        ).toThrow(/<Stepper.Indicator> must be inside <Stepper.Item>/);
        spy.mockRestore();
    });
});
