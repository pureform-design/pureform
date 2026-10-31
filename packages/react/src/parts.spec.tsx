import { screen } from "@testing-library/react";
import {
    type KeyboardEventHandler,
    type MouseEventHandler,
    type ReactNode,
    useState,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { mergeRefs, PureformProvider, useIconStyle } from ".";
import type { PureformProviderProps } from ".";
import { Button, Icon, Label, Root } from "./__fixtures__/button";
import { fakeRegistry } from "./__fixtures__/registry";
import { interact, mount, settle } from "./testing/render";

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

describe("parts", () => {
    it("carry the anatomy's attributes and the registry's classes, then the user's", async () => {
        withRegistry(
            <Root variant="text" className="mine on" title="save">
                <Label className="caps">Save</Label>
            </Root>,
        );
        await settle();
        const root = screen.getByTestId("pf-button-root");
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
        const label = screen.getByTestId("pf-button-label");
        expect(label.getAttribute("data-pf-part")).toBe("label");
        expect(label.id).toBe(`${root.id}:label`);
        expect([...label.classList]).toEqual(["button__label", "caps"]);
    });

    it("prefix every test id with Root's testId, or set them per part", () => {
        withRegistry(
            <>
                <Root testId="save">
                    <Label>Save</Label>
                </Root>
                <Root testId={{ label: "only-label" }}>
                    <Label>Other</Label>
                </Root>
            </>,
        );
        expect(screen.getByTestId("save-root").tagName).toBe("BUTTON");
        expect(screen.getByTestId("save-label").textContent).toBe("Save");
        expect(screen.getByTestId("only-label").textContent).toBe("Other");
        expect(screen.getByTestId("pf-button-root")).toBeTruthy();
    });

    it("merge the registry's token style with the user's style", () => {
        withRegistry(
            <Root
                tokens={{ radius: "6px" }}
                style={{ marginTop: 8, color: "red" }}
            >
                x
            </Root>,
        );
        const root = screen.getByTestId("pf-button-root");
        expect(root.style.getPropertyValue("--pf-button-radius")).toBe("6px");
        expect(root.style.marginTop).toBe("8px");
        expect(root.style.color).toBe("red");
    });

    it("drop the registry's styles when unstyled, for every part or one", () => {
        withRegistry(
            <>
                <Root
                    testId="a"
                    unstyled
                    tokens={{ radius: "6px" }}
                    className="mine"
                >
                    <Label>a</Label>
                </Root>
                <Root testId="b" unstyled={{ label: true }}>
                    <Label>b</Label>
                </Root>
                <Root testId="c">
                    <Label unstyled>c</Label>
                </Root>
            </>,
        );
        expect(screen.getByTestId("a-root").className).toBe("mine");
        expect(
            screen
                .getByTestId("a-root")
                .style.getPropertyValue("--pf-button-radius"),
        ).toBe("");
        expect(screen.getByTestId("a-label").className).toBe("");
        expect(screen.getByTestId("b-root").className).toContain("button");
        expect(screen.getByTestId("b-label").className).toBe("");
        expect(screen.getByTestId("c-label").className).toBe("");
    });

    it("render as another element", () => {
        withRegistry(
            <Root as="a" {...({ href: "#save" } as object)}>
                Save
            </Root>,
        );
        const root = screen.getByTestId("pf-button-root");
        expect(root.tagName).toBe("A");
        expect(root.getAttribute("href")).toBe("#save");
        expect(root.className).toContain("button");
    });

    it("run the machine's handlers and the user's, and pass the user's ref", async () => {
        const onClick = vi.fn<MouseEventHandler<HTMLElement>>();
        const onKeyDown = vi.fn<KeyboardEventHandler<HTMLElement>>();
        let ref: HTMLElement | null = null;
        withRegistry(
            <Root
                ref={(el: HTMLElement | null) => {
                    ref = el;
                }}
                onClick={onClick}
                onKeyDown={onKeyDown}
            >
                Save
            </Root>,
        );
        await settle();
        const root = screen.getByTestId("pf-button-root");
        expect(ref).toBe(root);

        root.focus();
        await interact(() => userEvent.keyboard("{Enter>}"));
        expect(onKeyDown).toHaveBeenCalledTimes(1);
        expect(root.hasAttribute("data-pf-active")).toBe(true);
        await interact(() => userEvent.keyboard("{/Enter}"));
        expect(root.hasAttribute("data-pf-active")).toBe(false);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("mark a mirrored icon, and leave the attribute off otherwise", async () => {
        let setMirror!: (mirror: boolean) => void;
        function App() {
            const [mirror, set] = useState(true);
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            setMirror = set;
            return (
                <Root>
                    <Icon mirror={mirror}>→</Icon>
                </Root>
            );
        }
        withRegistry(<App />);
        const icon = screen.getByTestId("pf-button-icon");
        expect(icon.hasAttribute("data-pf-mirror")).toBe(true);
        expect(icon.getAttribute("aria-hidden")).toBe("true");
        await interact(async () => setMirror(false));
        expect(icon.hasAttribute("data-pf-mirror")).toBe(false);
    });

    it("take the provider's slot props, merged before the user's", () => {
        withRegistry(
            <Root className="mine" title="user">
                <Label>Save</Label>
            </Root>,
            {
                slotProps: {
                    button: {
                        root: {
                            className: "provided",
                            title: "provider",
                            lang: "en",
                        },
                        label: { className: "provided-label" },
                    },
                },
            },
        );
        const root = screen.getByTestId("pf-button-root");
        expect([...root.classList].slice(-2)).toEqual(["provided", "mine"]);
        expect(root.title).toBe("user");
        expect(root.lang).toBe("en");
        expect(screen.getByTestId("pf-button-label").classList).toContain(
            "provided-label",
        );
    });

    it("pass the direction to the machine", async () => {
        withRegistry(<Root>Save</Root>, { dir: "rtl" });
        await settle();
        expect(screen.getByTestId("pf-button-root").getAttribute("dir")).toBe(
            "rtl",
        );
    });
});

describe("ready-made components", () => {
    it("address each part through slot-keyed props", () => {
        withRegistry(
            <Button
                label="Save"
                variant="text"
                className={{ root: ["wide", { busy: true }], label: "caps" }}
                style={{ root: { marginTop: "8px" } }}
                testId={{ root: "save", label: "save-label" }}
                slotProps={{ label: { "aria-live": "polite" } }}
            />,
        );
        const root = screen.getByTestId("save");
        expect([...root.classList]).toEqual([
            "button",
            "button--text",
            "button--small",
            "wide",
            "busy",
        ]);
        expect(root.style.marginTop).toBe("8px");
        const label = screen.getByTestId("save-label");
        expect(label.textContent).toBe("Save");
        expect([...label.classList]).toEqual(["button__label", "caps"]);
        expect(label.getAttribute("aria-live")).toBe("polite");
    });
});

describe("an instance's slotProps", () => {
    it("don't take appearance: a className or style there is dropped, and reported once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        withRegistry(
            <Button
                label="Save"
                testId="save"
                className={{ label: "caps" }}
                slotProps={{
                    label: {
                        "aria-live": "polite",
                        ...{ className: "slot", style: { color: "red" } },
                    },
                }}
            />,
        );
        const label = screen.getByTestId("save-label");
        expect([...label.classList]).toEqual(["button__label", "caps"]);
        expect(label.style.color).toBe("");
        expect(label.getAttribute("aria-live")).toBe("polite");
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining(
                'slotProps.label ignored "className", "style"',
            ),
        );
        warn.mockRestore();
    });
});

describe("useIconStyle", () => {
    function Glyph() {
        const icon = useIconStyle();
        return (
            <i
                data-size={String(icon.size)}
                data-color={icon.color}
                data-filled={String(icon.filled)}
            />
        );
    }

    it("measures the icon slot it's in, and gives the defaults outside one", async () => {
        const style = document.createElement("style");
        style.textContent = `.button__icon { font-size: 20px; color: rgb(1, 2, 3); font-variation-settings: "FILL" 1; }`;
        document.head.append(style);
        withRegistry(
            <>
                <Root>
                    <Icon>
                        <Glyph />
                    </Icon>
                </Root>
                <span data-testid="outside">
                    <Glyph />
                </span>
            </>,
        );
        await settle();
        const glyph = screen.getByTestId("pf-button-icon").querySelector("i")!;
        expect(glyph.dataset.size).toBe("20");
        expect(glyph.dataset.color).toBe("rgb(1, 2, 3)");
        expect(glyph.dataset.filled).toBe("true");
        const outside = screen.getByTestId("outside").querySelector("i")!;
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
        withRegistry(
            <Root defaultSelected={false}>
                <Icon>
                    <Glyph />
                </Icon>
            </Root>,
        );
        await settle();
        const glyph = screen.getByTestId("pf-button-icon").querySelector("i")!;
        expect(glyph.dataset.size).toBe("18");
        await interact(() =>
            userEvent.click(screen.getByTestId("pf-button-root")),
        );
        await settle();
        expect(
            screen.getByTestId("pf-button-root").getAttribute("aria-pressed"),
        ).toBe("true");
        expect(glyph.dataset.size).toBe("24");
        style.remove();
    });
});

describe("mergeRefs", () => {
    it("sets every ref, and clears them or runs their cleanups on detach", () => {
        const object = { current: null as HTMLElement | null };
        const calls: unknown[] = [];
        const cleanup = vi.fn<() => void>();
        const merged = mergeRefs<HTMLElement>(
            object,
            (value) => {
                calls.push(value);
            },
            () => cleanup,
            undefined,
        );
        const element = document.createElement("span");
        const detach = merged(element);
        expect(object.current).toBe(element);
        expect(calls).toEqual([element]);
        (detach as () => void)();
        expect(object.current).toBeNull();
        expect(calls).toEqual([element, null]);
        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
