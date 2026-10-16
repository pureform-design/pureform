import { buttonAnatomy, testIds } from "@pureform/anatomy";
import { createSignal, Errored } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Button } from ".";
import { PureformProvider } from "..";
import { fakeRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.button;
const neverLoads = () => new Promise<never>(() => {});

const withRegistry = (view: () => unknown, extra: object = {}) =>
    mount(() => (
        <PureformProvider registry={fakeRegistry(neverLoads)} {...extra}>
            {view() as never}
        </PureformProvider>
    ));

const queryTestId = (id: string) =>
    document.querySelector(`[data-testid="${id}"]`);

describe("Button, ready-made", () => {
    it("renders a native button with its touch target and label, in the anatomy's order", async () => {
        withRegistry(() => <Button label="Save" variant="text" size="large" />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.getAttribute("type")).toBe("button");
        expect(root.getAttribute("data-scope")).toBe("button");
        expect(root.className).toBe("button button--text button--large");
        expect(
            [...root.children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["touch-target", "label"]);
        expect(byTestId(ids.touchTarget).className).toBe(
            "button__touch-target",
        );
        expect(byTestId(ids.label).textContent).toBe("Save");
        expect(root.getAttribute("aria-pressed")).toBeNull();
    });

    it("renders the icon only when given, hidden from assistive technology", async () => {
        const [icon, setIcon] = createSignal<string | undefined>(undefined);
        withRegistry(() => <Button label="Next" icon={icon()} mirrorIcon />);
        await settle();
        expect(queryTestId(ids.icon)).toBeNull();

        setIcon("→");
        await settle();
        const iconPart = byTestId(ids.icon);
        expect(iconPart.textContent).toBe("→");
        expect(iconPart.getAttribute("aria-hidden")).toBe("true");
        expect(iconPart.hasAttribute("data-pf-mirror")).toBe(true);
        expect(iconPart.nextElementSibling).toBe(byTestId(ids.label));
    });

    it("addresses each part through slot-keyed class, style, and slotProps", () => {
        withRegistry(() => (
            <Button
                label="Save"
                class={{ root: ["wide", { busy: true }], label: "caps" }}
                style={{ root: { "margin-top": "8px" } }}
                slotProps={{ label: { title: "the label" } }}
                tokens={{ radius: "6px" }}
            />
        ));
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
        withRegistry(() => (
            <>
                <Button label="a" testId="save" icon="+" />
                <Button label="b" testId={{ label: "only-label" }} />
            </>
        ));
        for (const part of buttonAnatomy.partNames)
            expect(
                byTestId(`save-${buttonAnatomy.parts[part].attribute}`),
            ).toBeTruthy();
        expect(byTestId("only-label").textContent).toBe("b");
    });

    it("drops the registry's styles when unstyled, for every part or some", () => {
        withRegistry(() => (
            <>
                <Button
                    label="a"
                    testId="a"
                    unstyled
                    class={{ root: "mine" }}
                />
                <Button label="b" testId="b" unstyled={{ label: true }} />
            </>
        ));
        expect(byTestId("a-root").className).toBe("mine");
        expect(byTestId("a-label").className).toBe("");
        expect(byTestId("a-touch-target").className).toBe("");
        expect(byTestId("b-root").className).toContain("button");
        expect(byTestId("b-label").className).toBe("");
    });

    it("takes the provider's defaults and slot props", () => {
        withRegistry(() => <Button label="Save" />, {
            defaults: { button: { variant: "text" } },
            slotProps: { button: { label: { class: "provided" } } },
        });
        expect(byTestId(ids.root).className).toContain("button--text");
        expect(byTestId(ids.label).className).toBe("button__label provided");
    });

    it("forwards the element's own props, handlers, and id to the root", async () => {
        const onClick = vi.fn();
        withRegistry(() => (
            <Button
                label="Save"
                id="save"
                aria-describedby="hint"
                onClick={onClick}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.id).toBe("save");
        expect(root.getAttribute("aria-describedby")).toBe("hint");
        await userEvent.click(root);
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe("Button, keyboard and pointer", () => {
    it("clicks on Enter and Space, marking the press while the key is down", async () => {
        const onClick = vi.fn();
        withRegistry(() => <Button label="Save" onClick={onClick} />);
        await settle();
        const root = byTestId(ids.root);
        root.focus();

        await userEvent.keyboard("{Enter>}");
        await settle();
        expect(root.hasAttribute("data-pf-active")).toBe(true);
        await userEvent.keyboard("{/Enter}");
        await settle();
        expect(root.hasAttribute("data-pf-active")).toBe(false);

        await userEvent.keyboard(" ");
        await settle();
        expect(onClick).toHaveBeenCalledTimes(2);
    });

    it("can be reached with Tab, and not when disabled", async () => {
        withRegistry(() => (
            <>
                <Button label="a" testId="a" />
                <Button label="b" testId="b" disabled />
                <Button label="c" testId="c" />
            </>
        ));
        await settle();
        byTestId("a-root").focus();
        await userEvent.tab();
        expect(document.activeElement).toBe(byTestId("c-root"));
    });

    it("ignores clicks while disabled, by its prop or a disabled fieldset", async () => {
        const onClick = vi.fn();
        const [disabled, setDisabled] = createSignal(true);
        withRegistry(() => (
            <>
                <Button label="a" testId="a" disabled onClick={onClick} />
                <fieldset disabled={disabled()}>
                    <Button label="b" testId="b" onClick={onClick} />
                </fieldset>
            </>
        ));
        await settle();
        expect((byTestId("a-root") as HTMLButtonElement).disabled).toBe(true);
        expect(byTestId("b-root").matches(":disabled")).toBe(true);
        byTestId("a-root").click();
        byTestId("b-root").click();
        expect(onClick).not.toHaveBeenCalled();

        setDisabled(false);
        await settle();
        byTestId("b-root").click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

describe("Button, toggle", () => {
    it("toggles uncontrolled selection, reporting each change once", async () => {
        const onSelectedChange = vi.fn();
        withRegistry(() => (
            <Button
                label="Bold"
                defaultSelected={false}
                onSelectedChange={onSelectedChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-pressed")).toBe("false");
        await userEvent.click(root);
        await settle();
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(onSelectedChange).toHaveBeenCalledTimes(1);
        expect(onSelectedChange).toHaveBeenLastCalledWith({ selected: true });

        root.focus();
        await userEvent.keyboard(" ");
        await settle();
        expect(root.getAttribute("aria-pressed")).toBe("false");
        expect(onSelectedChange).toHaveBeenCalledTimes(2);
    });

    it("asks to change controlled selection, and moves only with the prop", async () => {
        const [selected, setSelected] = createSignal(false);
        const onSelectedChange = vi.fn();
        withRegistry(() => (
            <Button
                label="Bold"
                selected={selected()}
                onSelectedChange={onSelectedChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        await userEvent.click(root);
        await settle();
        expect(onSelectedChange).toHaveBeenCalledWith({ selected: true });
        expect(root.getAttribute("aria-pressed")).toBe("false");

        setSelected(true);
        await settle();
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(onSelectedChange).toHaveBeenCalledTimes(1);
    });
});

describe("Button, forms", () => {
    it("submits its name and value as the submitter, and resets the form", async () => {
        let submitted: FormData | undefined;
        withRegistry(() => (
            <form
                data-testid="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    submitted = new FormData(
                        event.currentTarget,
                        event.submitter,
                    );
                }}
            >
                <input data-testid="text" name="text" value="initial" />
                <Button label="Save" type="submit" name="action" value="save" />
                <Button label="Reset" testId="reset" type="reset" />
            </form>
        ));
        await settle();
        await userEvent.click(byTestId(ids.root));
        expect(submitted?.get("action")).toBe("save");

        const text = byTestId<HTMLInputElement>("text");
        text.value = "changed";
        await userEvent.click(byTestId("reset-root"));
        expect(text.value).toBe("initial");
    });
});

describe("Button, compound parts", () => {
    it("compose under Root, which renders as another element with `as`", async () => {
        withRegistry(() => (
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
            </>
        ));
        await settle();
        expect(byTestId("compound-root").className).toContain("button--text");
        expect(byTestId("compound-icon").className).toBe("button__icon");
        expect(byTestId("compound-label").className).toBe("");
        expect(byTestId("link-root").tagName).toBe("A");
        expect(byTestId("link-root").getAttribute("href")).toBe("#add");
    });

    it("throw outside Root, naming both", () => {
        mount(() => (
            <Errored
                fallback={(error) => (
                    <p data-testid="error">{String(error())}</p>
                )}
            >
                <Button.Label>Lost</Button.Label>
            </Errored>
        ));
        expect(byTestId("error").textContent).toMatch(
            /<Button.Label> must be inside <Button.Root>/,
        );
    });
});
