import { createSignal, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider, useIconStyle } from ".";
import { Button, Icon, Label, Root } from "./__fixtures__/button";
import { fakeRegistry } from "./__fixtures__/registry";
import { byTestId, mount, settle } from "./testing/mount";

const neverLoads = () => new Promise<never>(() => {});

const withRegistry = (view: () => unknown, extra: object = {}) =>
    mount(() => (
        <PureformProvider registry={fakeRegistry(neverLoads)} {...extra}>
            {view() as never}
        </PureformProvider>
    ));

describe("parts", () => {
    it("carry the anatomy's attributes and the registry's classes, then the user's", async () => {
        withRegistry(() => (
            <Root variant="text" class={["mine", { on: true }]} title="save">
                <Label class="caps">Save</Label>
            </Root>
        ));
        await settle();
        const root = byTestId("pf-button-root");
        expect(root.tagName).toBe("BUTTON");
        expect(root.getAttribute("data-scope")).toBe("button");
        expect(root.getAttribute("data-pf-part")).toBe("root");
        expect(root.getAttribute("type")).toBe("button");
        expect(root.getAttribute("title")).toBe("save");
        expect([...root.classList]).toEqual([
            "button",
            "button--text",
            "button--small",
            "mine",
            "on",
        ]);
        const label = byTestId("pf-button-label");
        expect(label.getAttribute("data-pf-part")).toBe("label");
        expect(label.id).toBe(
            `button:${root.id.replace(/^button:/, "")}:label`,
        );
        expect([...label.classList]).toEqual(["button__label", "caps"]);
    });

    it("prefix every test id with Root's testId, or set them per part", () => {
        withRegistry(() => (
            <>
                <Root testId="save">
                    <Label>Save</Label>
                </Root>
                <Root testId={{ label: "only-label" }}>
                    <Label>Other</Label>
                </Root>
            </>
        ));
        expect(byTestId("save-root").tagName).toBe("BUTTON");
        expect(byTestId("save-label").textContent).toBe("Save");
        expect(byTestId("only-label").textContent).toBe("Other");
        expect(byTestId("pf-button-root")).toBeTruthy();
    });

    it("merge the registry's token style with the user's style", () => {
        withRegistry(() => (
            <Root
                tokens={{ radius: "6px" }}
                // oxlint-disable-next-line solid/style-prop -- a string style on purpose: the merge must accept one
                style="margin-top: 8px; color: red"
            >
                x
            </Root>
        ));
        const root = byTestId("pf-button-root");
        expect(root.style.getPropertyValue("--pf-button-radius")).toBe("6px");
        expect(root.style.marginTop).toBe("8px");
        expect(root.style.color).toBe("red");
    });

    it("drop the registry's styles when unstyled, for every part or one", () => {
        withRegistry(() => (
            <>
                <Root
                    testId="a"
                    unstyled
                    tokens={{ radius: "6px" }}
                    class="mine"
                >
                    <Label>a</Label>
                </Root>
                <Root testId="b" unstyled={{ label: true }}>
                    <Label>b</Label>
                </Root>
                <Root testId="c">
                    <Label unstyled>c</Label>
                </Root>
            </>
        ));
        expect(byTestId("a-root").className).toBe("mine");
        expect(
            byTestId("a-root").style.getPropertyValue("--pf-button-radius"),
        ).toBe("");
        expect(byTestId("a-label").className).toBe("");
        expect(byTestId("b-root").className).toContain("button");
        expect(byTestId("b-label").className).toBe("");
        expect(byTestId("c-label").className).toBe("");
    });

    it("render as another element", () => {
        withRegistry(() => (
            <Root as="a" {...({ href: "#save" } as object)}>
                Save
            </Root>
        ));
        const root = byTestId("pf-button-root");
        expect(root.tagName).toBe("A");
        expect(root.getAttribute("href")).toBe("#save");
        expect(root.className).toContain("button");
    });

    it("run the machine's handlers and the user's, and pass the user's ref", async () => {
        const onClick = vi.fn<(event: MouseEvent) => void>();
        const onKeyDown = vi.fn<(event: KeyboardEvent) => void>();
        let ref: HTMLElement | undefined;
        withRegistry(() => (
            <Root
                ref={(el: HTMLElement) => (ref = el)}
                onClick={onClick}
                onKeyDown={onKeyDown}
            >
                Save
            </Root>
        ));
        await settle();
        const root = byTestId("pf-button-root");
        expect(ref).toBe(root);

        root.focus();
        await userEvent.keyboard("{Enter>}");
        await settle();
        expect(onKeyDown).toHaveBeenCalledTimes(1);
        expect(root.hasAttribute("data-pf-active")).toBe(true);
        await userEvent.keyboard("{/Enter}");
        await settle();
        expect(root.hasAttribute("data-pf-active")).toBe(false);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("mark a mirrored icon, and leave the attribute off otherwise", () => {
        const [mirror, setMirror] = createSignal(true);
        withRegistry(() => (
            <Root>
                <Icon mirror={mirror()}>→</Icon>
            </Root>
        ));
        const icon = byTestId("pf-button-icon");
        expect(icon.hasAttribute("data-pf-mirror")).toBe(true);
        expect(icon.getAttribute("aria-hidden")).toBe("true");
        setMirror(false);
        flush();
        expect(icon.hasAttribute("data-pf-mirror")).toBe(false);
    });

    it("take the provider's slot props, merged before the user's", () => {
        withRegistry(
            () => (
                <Root class="mine" title="user">
                    <Label>Save</Label>
                </Root>
            ),
            {
                slotProps: {
                    button: {
                        root: {
                            class: "provided",
                            title: "provider",
                            lang: "en",
                        },
                        label: { class: "provided-label" },
                    },
                },
            },
        );
        const root = byTestId("pf-button-root");
        expect([...root.classList].slice(-2)).toEqual(["provided", "mine"]);
        expect(root.title).toBe("user");
        expect(root.lang).toBe("en");
        expect(byTestId("pf-button-label").classList).toContain(
            "provided-label",
        );
    });

    it("pass the direction to the machine", async () => {
        withRegistry(() => <Root>Save</Root>, { dir: "rtl" });
        await settle();
        expect(byTestId("pf-button-root").getAttribute("dir")).toBe("rtl");
    });
});

describe("ready-made components", () => {
    it("address each part through slot-keyed props", () => {
        withRegistry(() => (
            <Button
                label="Save"
                variant="text"
                class={{ root: ["wide", { busy: true }], label: "caps" }}
                // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                style={{ root: { "margin-top": "8px" } }}
                testId={{ root: "save", label: "save-label" }}
                slotProps={{ label: { "aria-live": "polite", class: "slot" } }}
            />
        ));
        const root = byTestId("save");
        expect([...root.classList]).toEqual([
            "button",
            "button--text",
            "button--small",
            "wide",
            "busy",
        ]);
        expect(root.style.marginTop).toBe("8px");
        const label = byTestId("save-label");
        expect(label.textContent).toBe("Save");
        expect([...label.classList]).toEqual(["button__label", "slot", "caps"]);
        expect(label.getAttribute("aria-live")).toBe("polite");
    });
});

describe("useIconStyle", () => {
    it("measures the icon slot it's in, and gives the defaults outside one", async () => {
        const style = document.createElement("style");
        style.textContent = `.button__icon { font-size: 20px; color: rgb(1, 2, 3); font-variation-settings: "FILL" 1; }`;
        document.head.append(style);
        function Glyph() {
            const icon = useIconStyle();
            return (
                <i
                    data-testid="glyph"
                    data-size={String(icon().size)}
                    data-color={icon().color}
                    data-filled={String(icon().filled)}
                />
            );
        }
        withRegistry(() => (
            <>
                <Root>
                    <Icon>
                        <Glyph />
                    </Icon>
                </Root>
                <span data-testid="outside">
                    <Glyph />
                </span>
            </>
        ));
        await settle();
        const glyph = byTestId("pf-button-icon").querySelector("i")!;
        expect(glyph.dataset.size).toBe("20");
        expect(glyph.dataset.color).toBe("rgb(1, 2, 3)");
        expect(glyph.dataset.filled).toBe("true");
        const outside = byTestId("outside").querySelector("i")!;
        expect(outside.dataset.size).toBe("undefined");
        expect(outside.dataset.color).toBe("currentColor");
        style.remove();
    });

    it("follows the component's state", async () => {
        const style = document.createElement("style");
        style.textContent = `
            .button__icon { font-size: 18px; }
            [aria-pressed="true"] > .button__icon { font-size: 24px; }`;
        document.head.append(style);
        function Glyph() {
            const icon = useIconStyle();
            return <i data-size={String(icon().size)} />;
        }
        withRegistry(() => (
            <Root defaultSelected={false}>
                <Icon>
                    <Glyph />
                </Icon>
            </Root>
        ));
        await settle();
        const glyph = byTestId("pf-button-icon").querySelector("i")!;
        expect(glyph.dataset.size).toBe("18");
        await userEvent.click(byTestId("pf-button-root"));
        await settle();
        await settle();
        expect(byTestId("pf-button-root").getAttribute("aria-pressed")).toBe(
            "true",
        );
        expect(glyph.dataset.size).toBe("24");
        style.remove();
    });
});
