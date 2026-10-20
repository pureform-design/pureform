import { buttonAnatomy, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Button } from ".";
import { PureformProvider } from "..";
import type { PureformProviderProps } from "..";
import { fakeRegistry } from "../__fixtures__/registry";
import {
    Errored,
    interact,
    mount,
    outside,
    quietly,
    settle,
} from "../testing/render";

const ids = testIds.button;
const neverLoads = () => new Promise<never>(() => {});
const registry = fakeRegistry(neverLoads);

const withRegistry = (
    view: ReactNode,
    extra: Omit<PureformProviderProps, "registry"> = {},
) =>
    mount(
        <PureformProvider registry={registry} {...extra}>
            {view}
        </PureformProvider>,
    );

const byTestId = <E extends HTMLElement = HTMLElement>(id: string) =>
    screen.getByTestId<E>(id);
const queryTestId = (id: string) => screen.queryByTestId(id);

describe("Button, ready-made", () => {
    it("renders a native button with its touch target and label, in the anatomy's order", async () => {
        withRegistry(<Button label="Save" variant="text" size="large" />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.getAttribute("type")).toBe("button");
        expect(root.getAttribute("data-scope")).toBe("button");
        expect(root.className).toBe("button button--text button--large");
        expect(
            [...root.children].map(
                (child) =>
                    child.getAttribute("data-pf-part") ??
                    (child.hasAttribute("data-ripple-layer") ? "layer" : null),
            ),
        ).toEqual(["layer", "touch-target", "label"]);
        expect(byTestId(ids.touchTarget).className).toBe(
            "button__touch-target",
        );
        expect(byTestId(ids.label).textContent).toBe("Save");
        expect(root.getAttribute("aria-pressed")).toBeNull();
    });

    it("renders the icon only when given, hidden from assistive technology", async () => {
        const icon = outside<string | undefined>(undefined);
        withRegistry(
            <icon.Holder>
                {(value) => <Button label="Next" icon={value} mirrorIcon />}
            </icon.Holder>,
        );
        await settle();
        expect(queryTestId(ids.icon)).toBeNull();

        await icon.set("→");
        await settle();
        const iconPart = byTestId(ids.icon);
        expect(iconPart.textContent).toBe("→");
        expect(iconPart.getAttribute("aria-hidden")).toBe("true");
        expect(iconPart.hasAttribute("data-pf-mirror")).toBe(true);
        expect(iconPart.nextElementSibling).toBe(byTestId(ids.label));
    });

    it("addresses each part through slot-keyed className, style, and slotProps", () => {
        withRegistry(
            <Button
                label="Save"
                className={{ root: ["wide", { busy: true }], label: "caps" }}
                style={{ root: { marginTop: "8px" } }}
                slotProps={{ label: { title: "the label" } }}
                tokens={{ radius: "6px" }}
            />,
        );
        const root = byTestId(ids.root);
        expect(root.className).toBe(
            "button button--filled button--small wide busy",
        );
        expect(root.style.marginTop).toBe("8px");
        expect(root.style.getPropertyValue("--pf-button-radius")).toBe("6px");
        expect(byTestId(ids.label).className).toBe("button__label caps");
        expect(byTestId(ids.label).title).toBe("the label");
    });

    it("prefixes every test id, or sets them by part", () => {
        withRegistry(
            <>
                <Button label="a" testId="save" icon="+" secondaryIcon="▾" />
                <Button label="b" testId={{ label: "only-label" }} />
            </>,
        );
        for (const part of buttonAnatomy.partNames)
            expect(
                byTestId(`save-${buttonAnatomy.parts[part].attribute}`),
            ).toBeTruthy();
        expect(byTestId("only-label").textContent).toBe("b");
    });

    it("drops the registry's styles when unstyled, for every part or some", () => {
        withRegistry(
            <>
                <Button
                    label="a"
                    testId="a"
                    unstyled
                    className={{ root: "mine" }}
                />
                <Button label="b" testId="b" unstyled={{ label: true }} />
            </>,
        );
        expect(byTestId("a-root").className).toBe("mine");
        expect(byTestId("a-label").className).toBe("");
        expect(byTestId("a-touch-target").className).toBe("");
        expect(byTestId("b-root").className).toContain("button");
        expect(byTestId("b-label").className).toBe("");
    });

    it("takes the provider's defaults and slot props", () => {
        withRegistry(<Button label="Save" />, {
            defaults: { button: { variant: "text" } },
            slotProps: { button: { label: { className: "provided" } } },
        });
        expect(byTestId(ids.root).className).toContain("button--text");
        expect(byTestId(ids.label).className).toBe("button__label provided");
    });

    it("forwards the element's own props, handlers, ref, and id to the root", async () => {
        const onClick = vi.fn();
        const ref = { current: null as HTMLElement | null };
        withRegistry(
            <Button
                label="Save"
                id="save"
                aria-describedby="hint"
                onClick={onClick}
                ref={ref}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.id).toBe("save");
        expect(root.getAttribute("aria-describedby")).toBe("hint");
        expect(ref.current).toBe(root);
        await interact(() => userEvent.click(root));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe("Button, keyboard and pointer", () => {
    it("clicks on Enter and Space, marking the press while the key is down", async () => {
        const onClick = vi.fn();
        withRegistry(<Button label="Save" onClick={onClick} />);
        await settle();
        const root = byTestId(ids.root);
        root.focus();

        await interact(() => userEvent.keyboard("{Enter>}"));
        expect(root.hasAttribute("data-pf-active")).toBe(true);
        await interact(() => userEvent.keyboard("{/Enter}"));
        expect(root.hasAttribute("data-pf-active")).toBe(false);

        await interact(() => userEvent.keyboard(" "));
        expect(onClick).toHaveBeenCalledTimes(2);
    });

    it("can be reached with Tab, and not when disabled", async () => {
        withRegistry(
            <>
                <Button label="a" testId="a" />
                <Button label="b" testId="b" disabled />
                <Button label="c" testId="c" />
            </>,
        );
        await settle();
        byTestId("a-root").focus();
        await interact(() => userEvent.tab());
        expect(document.activeElement).toBe(byTestId("c-root"));
    });

    it("ignores clicks while disabled, by its prop or a disabled fieldset", async () => {
        const onClick = vi.fn();
        const disabled = outside(true);
        withRegistry(
            <>
                <Button label="a" testId="a" disabled onClick={onClick} />
                <disabled.Holder>
                    {(value) => (
                        <fieldset disabled={value}>
                            <Button label="b" testId="b" onClick={onClick} />
                        </fieldset>
                    )}
                </disabled.Holder>
            </>,
        );
        await settle();
        expect(byTestId<HTMLButtonElement>("a-root").disabled).toBe(true);
        expect(byTestId("b-root").matches(":disabled")).toBe(true);
        byTestId("a-root").click();
        byTestId("b-root").click();
        expect(onClick).not.toHaveBeenCalled();

        await disabled.set(false);
        await settle();
        byTestId("b-root").click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe("Button, toggle", () => {
    it("toggles uncontrolled selection, reporting each change once", async () => {
        const onSelectedChange = vi.fn();
        withRegistry(
            <Button
                label="Bold"
                defaultSelected={false}
                onSelectedChange={onSelectedChange}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-pressed")).toBe("false");
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(onSelectedChange).toHaveBeenCalledTimes(1);
        expect(onSelectedChange).toHaveBeenLastCalledWith({ selected: true });

        root.focus();
        await interact(() => userEvent.keyboard(" "));
        expect(root.getAttribute("aria-pressed")).toBe("false");
        expect(onSelectedChange).toHaveBeenCalledTimes(2);
    });

    it("asks to change controlled selection, and moves only with the prop", async () => {
        const selected = outside(false);
        const onSelectedChange = vi.fn();
        withRegistry(
            <selected.Holder>
                {(value) => (
                    <Button
                        label="Bold"
                        selected={value}
                        onSelectedChange={onSelectedChange}
                    />
                )}
            </selected.Holder>,
        );
        await settle();
        const root = byTestId(ids.root);
        await interact(() => userEvent.click(root));
        expect(onSelectedChange).toHaveBeenCalledWith({ selected: true });
        expect(root.getAttribute("aria-pressed")).toBe("false");

        await selected.set(true);
        await settle();
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(onSelectedChange).toHaveBeenCalledTimes(1);
    });
});

describe("Button, forms", () => {
    it("submits its name and value as the submitter, and resets the form", async () => {
        let submitted: FormData | undefined;
        withRegistry(
            <form
                data-testid="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    submitted = new FormData(
                        event.currentTarget,
                        (event.nativeEvent as SubmitEvent).submitter,
                    );
                }}
            >
                <input data-testid="text" name="text" defaultValue="initial" />
                <Button label="Save" type="submit" name="action" value="save" />
                <Button label="Reset" testId="reset" type="reset" />
            </form>,
        );
        await settle();
        await interact(() => userEvent.click(byTestId(ids.root)));
        expect(submitted?.get("action")).toBe("save");

        const text = byTestId<HTMLInputElement>("text");
        text.value = "changed";
        await interact(() => userEvent.click(byTestId("reset-root")));
        expect(text.value).toBe("initial");
    });
});

describe("Button, compound parts", () => {
    it("compose under Root, which renders as another element with `as`", async () => {
        withRegistry(
            <>
                <Button.Root variant="text" testId="compound">
                    <Button.TouchTarget />
                    <Button.Icon mirror>+</Button.Icon>
                    <Button.Label unstyled>Add</Button.Label>
                </Button.Root>
                <Button.Root
                    as="a"
                    testId="link"
                    {...({ href: "#add" } as object)}
                >
                    <Button.Label>Link</Button.Label>
                </Button.Root>
            </>,
        );
        await settle();
        expect(byTestId("compound-root").className).toContain("button--text");
        expect(byTestId("compound-icon").className).toBe("button__icon");
        expect(byTestId("compound-label").className).toBe("");
        expect(byTestId("link-root").tagName).toBe("A");
        expect(byTestId("link-root").getAttribute("href")).toBe("#add");
    });

    it("throw outside Root, naming both", () => {
        quietly(() =>
            mount(
                <Errored>
                    <Button.Label>Lost</Button.Label>
                </Errored>,
            ),
        );
        expect(byTestId("error").textContent).toMatch(
            /<Button.Label> must be inside <Button.Root>/,
        );
    });
});
