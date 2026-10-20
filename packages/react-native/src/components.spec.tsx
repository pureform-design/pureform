import { act } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Glyph, PureformProvider, useIconStyle } from ".";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Card } from "./card";
import { Checkbox } from "./checkbox";
import { Chip } from "./chip";
import { CircularProgress } from "./circular-progress";
import { Dialog } from "./dialog";
import { animated } from "./engine";
import { animatedSvg } from "./engines/svg";
import { Fab } from "./fab";
import { FullscreenDialog } from "./fullscreen-dialog";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { LinearProgress } from "./linear-progress";
import { List } from "./list";
import { ListItem } from "./list-item";
import { Media } from "./media";
import { Menu } from "./menu";
import { NavigationBar } from "./navigation-bar";
import { NavigationRail } from "./navigation-rail";
import { Radio, RadioGroup } from "./radio-group";
import { Scrim } from "./scrim";
import { SearchBar } from "./search-bar";
import { Select } from "./select";
import { Separator } from "./separator";
import { Slider } from "./slider";
import { Snackbar } from "./snackbar";
import { SupportingText } from "./supporting-text";
import { Switch } from "./switch";
import { Tabs } from "./tabs";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import {
    byTestId,
    computed,
    interact,
    mount,
    outside,
    pointerAway,
    settle,
    until,
} from "./testing/render";
import { Text } from "./text";
import { TextArea } from "./text-area";
import { TextField } from "./text-field";
import { Tooltip } from "./tooltip";

const COMPONENTS = [
    "button",
    "chip",
    "checkbox",
    "switchControl",
    "radio",
    "card",
    "text",
    "avatar",
    "icon",
    "iconButton",
    "fab",
    "separator",
    "list",
    "listItem",
    "linearProgress",
    "circularProgress",
    "scrim",
    "supportingText",
    "media",
    "textField",
    "textArea",
    "searchBar",
    "select",
    "slider",
    "menu",
    "tabs",
    "navigationBar",
    "navigationRail",
    "dialog",
    "fullscreenDialog",
    "snackbar",
    "tooltip",
    "ripple",
];

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(COMPONENTS);
});

const render = (node: ReactNode, engine = animated) =>
    mount(
        <PureformProvider registry={registry} engine={engine} motion="reduce">
            {node}
        </PureformProvider>,
    );

const DESTINATIONS = [
    { value: "mail", label: "Mail", icon: <Glyph glyph="✉" /> },
    { value: "chat", label: "Chat", icon: <Glyph glyph="☏" /> },
];

describe("every component", () => {
    it("renders its parts with their default test ids", async () => {
        await render(
            <>
                <Button label="Save" icon={<Glyph glyph="+" />} />
                <Chip label="Nearby" />
                <Checkbox aria-label="Agree" />
                <Switch aria-label="Wi-Fi" />
                <RadioGroup items={[{ value: "a", label: "A" }]} />
                <Radio aria-label="On its own" checked testId="alone" />
                <Card>
                    <Text textStyle="bodyMedium">Card</Text>
                </Card>
                <Avatar label="Ada">AL</Avatar>
                <Icon label="Star">
                    <Glyph glyph="★" />
                </Icon>
                <IconButton
                    aria-label="Edit"
                    icon={<Glyph glyph="✎" />}
                    variant="outlined"
                />
                <Fab icon={<Glyph glyph="+" />} label="Compose" />
                <Separator />
                <ListItem
                    headline="Inbox"
                    supportingText="3 new"
                    onPress={() => {}}
                />
                <List items={[{ headline: "Drafts" }]} />
                <LinearProgress value={40} />
                <CircularProgress />
                <Scrim />
                <SupportingText>Help</SupportingText>
                <Media source={{ uri: "data:," }} />
                <TextField label="Name" />
                <TextArea label="Bio" />
                <SearchBar />
                <Select label="Size" items={[{ value: "s", label: "Small" }]} />
                <Slider aria-label="Volume" />
                <Menu items={[{ value: "cut", label: "Cut" }]} />
                <Tabs items={DESTINATIONS} />
                <NavigationBar items={DESTINATIONS} />
                <NavigationRail items={DESTINATIONS} />
                <Dialog
                    headline="Discard?"
                    actions={<Button label="Cancel" variant="text" />}
                >
                    Gone for good.
                </Dialog>
                <FullscreenDialog
                    headline="New event"
                    confirmAction={<Button label="Save" variant="text" />}
                >
                    Details.
                </FullscreenDialog>
                <Snackbar supportingText="Archived" action="Undo" />
                <Tooltip supportingText="Save" />
            </>,
        );
        for (const id of [
            "pf-button-root",
            "pf-button-icon",
            "pf-button-label",
            "pf-chip-root",
            "pf-checkbox-box",
            "pf-switch-control-handle",
            "pf-radio-dot",
            "alone-dot",
            "pf-card-root",
            "pf-text-root",
            "pf-avatar-root",
            "pf-icon-root",
            "pf-icon-button-container",
            "pf-icon-button-outline",
            "pf-fab-label",
            "pf-separator-root",
            "pf-list-item-headline",
            "pf-list-root",
            "pf-list-item",
            "pf-linear-progress-indicator",
            "pf-circular-progress-end-arc",
            "pf-scrim-root",
            "pf-supporting-text-root",
            "pf-media-root",
            "pf-text-field-input",
            "pf-text-area-label",
            "pf-search-bar-input",
            "pf-select-trailing-icon",
            "pf-slider-handle",
            "pf-menu-item-label",
            "pf-tabs-indicator",
            "pf-navigation-bar-active-indicator",
            "pf-navigation-rail-icon",
            "pf-dialog-headline",
            "pf-fullscreen-dialog-header",
            "pf-fullscreen-dialog-headline",
            "pf-fullscreen-dialog-close-trigger",
            "pf-fullscreen-dialog-confirm-action",
            "pf-fullscreen-dialog-body",
            "pf-snackbar-close",
            "pf-tooltip-root",
        ]) {
            expect(
                document.querySelectorAll(`[data-testid="${id}"]`).length,
                id,
            ).toBeGreaterThan(0);
        }
    });

    it("takes a test id prefix", async () => {
        await render(<Button label="Save" testId="save" />);
        expect(byTestId("save-root").textContent).toBe("Save");
        expect(byTestId("save-label")).toBeTruthy();
    });
});

describe("controlled and uncontrolled state", () => {
    it("checks an uncontrolled checkbox and reports it", async () => {
        const change = vi.fn();
        await render(<Checkbox aria-label="Agree" onCheckedChange={change} />);
        const root = byTestId("pf-checkbox-root");
        expect(root.getAttribute("aria-checked")).toBe("false");
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-checked")).toBe("true");
        expect(change).toHaveBeenCalledExactlyOnceWith({ checked: true });
    });

    it("keeps a controlled switch until its prop changes", async () => {
        const change = vi.fn();
        await render(
            <Switch
                aria-label="Wi-Fi"
                checked={false}
                onCheckedChange={change}
            />,
        );
        const root = byTestId("pf-switch-control-root");
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-checked")).toBe("false");
        expect(change).toHaveBeenCalledExactlyOnceWith({ checked: true });
    });

    it("picks a radio in its group", async () => {
        const change = vi.fn();
        await render(
            <RadioGroup
                items={[
                    { value: "s", label: "Small", testId: "s" },
                    { value: "m", label: "Medium", testId: "m" },
                ]}
                defaultValue="s"
                onValueChange={change}
            />,
        );
        expect(byTestId("s-root").getAttribute("aria-checked")).toBe("true");
        await interact(() => userEvent.click(byTestId("m-root")));
        expect(byTestId("m-root").getAttribute("aria-checked")).toBe("true");
        expect(byTestId("s-root").getAttribute("aria-checked")).toBe("false");
        expect(change).toHaveBeenCalledExactlyOnceWith({ value: "m" });
    });

    it("toggles an icon button given selected, and draws its icon filled", async () => {
        const seen: boolean[] = [];
        function Probe() {
            seen.push(useIconStyle().filled);
            return null;
        }
        await render(
            <IconButton
                aria-label="Favorite"
                defaultSelected={false}
                icon={<Probe />}
            />,
        );
        expect(seen.at(-1)).toBe(false);
        await interact(() => userEvent.click(byTestId("pf-icon-button-root")));
        expect(seen.at(-1)).toBe(true);
    });

    it("moves between tabs", async () => {
        await render(<Tabs items={DESTINATIONS} />);
        const [mail, chat] = document.querySelectorAll('[role="tab"]');
        expect(mail!.getAttribute("aria-selected")).toBe("true");
        await interact(() => userEvent.click(chat!));
        expect(chat!.getAttribute("aria-selected")).toBe("true");
        expect(mail!.getAttribute("aria-selected")).toBe("false");
    });

    it("opens a select's menu and picks from it", async () => {
        const change = vi.fn();
        await render(
            <Select
                label="Size"
                items={[
                    { value: "s", label: "Small" },
                    { value: "l", label: "Large" },
                ]}
                onValueChange={change}
            />,
        );
        await interact(() =>
            userEvent.click(document.querySelector('[role="combobox"]')!),
        );
        await settle(50);
        const large = [...document.querySelectorAll('[role="menuitem"]')].find(
            (item) => item.textContent === "Large",
        )!;
        await interact(() => userEvent.click(large));
        expect(change).toHaveBeenCalledExactlyOnceWith({ value: "l" });
        expect((byTestId("pf-select-input") as HTMLInputElement).value).toBe(
            "Large",
        );
    });

    it("keeps a select's label for its value after the item leaves, until the value changes", async () => {
        const SMALL = { value: "s", label: "Small" };
        const MEDIUM = { value: "m", label: "Medium" };
        const state = outside<{
            items: readonly (typeof SMALL)[];
            value: string | null;
        }>({ items: [SMALL, MEDIUM], value: "m" });
        await render(
            <state.Holder>
                {({ items, value }) => (
                    <Select label="Size" items={items} value={value} />
                )}
            </state.Holder>,
        );
        const shown = () =>
            (byTestId("pf-select-input") as HTMLInputElement).value;
        expect(shown()).toBe("Medium");
        await state.set({ items: [SMALL], value: "m" });
        expect(shown()).toBe("Medium");
        await state.set({ items: [SMALL], value: "s" });
        expect(shown()).toBe("Small");
        await state.set({ items: [SMALL], value: "m" });
        expect(shown()).toBe("");
        await state.set({ items: [SMALL, MEDIUM], value: "m" });
        expect(shown()).toBe("Medium");
        await state.set({ items: [SMALL], value: null });
        expect(shown()).toBe("");
        await state.set({ items: [SMALL, MEDIUM], value: "m" });
        await state.set({ items: [{ value: "m", label: "Mid" }], value: "m" });
        expect(shown()).toBe("Mid");
    });
});

describe("icons", () => {
    it("give an icon its slot's size and color", async () => {
        let style: ReturnType<typeof useIconStyle> | undefined;
        function Probe() {
            style = useIconStyle();
            return null;
        }
        await render(<Button label="Add" icon={<Probe />} />);
        // M3 Expressive's small button holds a 20dp icon.
        expect(style!.size).toBe(20);
        expect(style!.color).toMatch(/^rgba?\(/);
        expect(style!.filled).toBe(false);
        expect(computed("pf-button-label").color).toBe(
            style!.color.replace("rgba(", "rgb(").replace(/, 1\)$/, ")"),
        );
    });

    it("fill the current destination's icon", async () => {
        const fills: Record<string, boolean> = {};
        function Probe(props: { name: string }) {
            fills[props.name] = useIconStyle().filled;
            return null;
        }
        await render(
            <NavigationBar
                items={[
                    { value: "a", label: "A", icon: <Probe name="a" /> },
                    { value: "b", label: "B", icon: <Probe name="b" /> },
                ]}
                defaultValue="b"
            />,
        );
        expect(fills).toEqual({ a: false, b: true });
    });

    it("put a horizontal destination's label beside its icon, in the pill", async () => {
        await render(
            <NavigationBar
                items={DESTINATIONS}
                itemLayout="horizontal"
                defaultValue="mail"
                testId="h"
            />,
        );
        expect(computed("h-item").flexDirection).toBe("row");
        expect(computed("h-indicator").position).toBe("absolute");
    });

    it("render the rail's header, expanded, and as a modal over the scrim", async () => {
        await render(
            <>
                <NavigationRail
                    items={DESTINATIONS}
                    header={<Glyph glyph="☰" />}
                    expanded
                    testId="r"
                />
                <NavigationRail
                    items={DESTINATIONS}
                    modal
                    defaultOpen
                    testId="m"
                />
            </>,
        );
        expect(
            document.querySelector('[data-testid="r-header"]'),
        ).not.toBeNull();
        expect(computed("r-item").flexDirection).toBe("row");
        expect(computed("m-root").borderTopRightRadius).not.toBe("0px");
        expect(computed("m-item").flexDirection).toBe("row");
    });
});

describe("motion engines", () => {
    it("keep the app's state when the engine changes, and draw shapes with SVG", async () => {
        function App() {
            const [svg, setSvg] = useState(false);
            const [checked, setChecked] = useState(true);
            return (
                <PureformProvider
                    registry={registry}
                    engine={svg ? animatedSvg : animated}
                >
                    <Chip
                        label="svg"
                        onPress={() => setSvg(true)}
                        testId="svg"
                    />
                    <Checkbox
                        aria-label="Agree"
                        checked={checked}
                        onCheckedChange={(d) => setChecked(d.checked === true)}
                    />
                    <IconButton
                        aria-label="Edit"
                        variant="filled"
                        shape="cookie4Sided"
                        icon={<Glyph glyph="✎" />}
                    />
                </PureformProvider>
            );
        }
        await mount(<App />);
        expect(document.querySelector("svg")).toBeNull();
        await act(async () => {
            await userEvent.click(byTestId("svg-root"));
        });
        await settle(50);
        expect(byTestId("pf-checkbox-root").getAttribute("aria-checked")).toBe(
            "true",
        );
        expect(
            byTestId("pf-icon-button-container").querySelector("svg path"),
        ).not.toBeNull();
    });
});

describe("text field affixes, counter and secure", () => {
    it("renders the prefix, suffix and counter, and turns invalid past counterMax", async () => {
        await render(
            <TextField
                label="Price"
                prefixText="$"
                suffixText=".00"
                counterMax={2}
                defaultValue="12"
            />,
        );
        expect(byTestId("pf-text-field-prefix-text").textContent).toBe("$");
        expect(byTestId("pf-text-field-suffix-text").textContent).toBe(".00");
        expect(byTestId("pf-text-field-counter").textContent).toBe("2 / 2");
        expect(byTestId("pf-text-field-supporting-row")).toBeTruthy();
        const input = byTestId("pf-text-field-input") as HTMLInputElement;
        expect(input.getAttribute("aria-invalid")).not.toBe("true");
    });

    it("hides a secure field's text until the trailing icon reveals it", async () => {
        await render(<TextField label="Password" secure />);
        const input = byTestId("pf-text-field-input") as HTMLInputElement;
        expect(input.type).toBe("password");
        const toggle = byTestId("pf-text-field-trailing-icon");
        expect(toggle.getAttribute("aria-pressed")).toBe("false");
        await interact(() => toggle.click());
        await settle();
        expect(input.type).toBe("text");
    });
});

describe("lists, menus, and selects", () => {
    const corners = (element: Element) => {
        const style = getComputedStyle(element);
        return [style.borderTopLeftRadius, style.borderBottomLeftRadius];
    };

    it("rounds a segmented list's tiles by their position", async () => {
        await render(
            <List
                variant="segmented"
                items={["Inbox", "Drafts", "Sent"].map((headline) => ({
                    headline,
                }))}
            />,
        );
        const [first, middle, last] = document.querySelectorAll(
            '[data-testid="pf-list-item-root"]',
        );
        const [firstTop, firstBottom] = corners(first!);
        const [middleTop, middleBottom] = corners(middle!);
        const [lastTop, lastBottom] = corners(last!);
        expect(firstTop).not.toBe(firstBottom);
        expect(middleTop).toBe(middleBottom);
        expect(middleTop).toBe(firstBottom);
        expect(lastBottom).toBe(firstTop);
        expect(lastTop).toBe(middleTop);
    });

    it("leaves a standard list's items square", async () => {
        await render(
            <List items={[{ headline: "Inbox" }, { headline: "Drafts" }]} />,
        );
        const [first] = document.querySelectorAll(
            '[data-testid="pf-list-item-root"]',
        );
        const [top, bottom] = corners(first!);
        expect(top).toBe(bottom);
    });

    it("gives its items its leading type, which an item's own overrides", async () => {
        const leading = <Glyph glyph="✉" />;
        await render(
            <>
                <List
                    leadingType="thumbnail"
                    testId="thumbs"
                    items={[
                        { headline: "A", leading },
                        { headline: "B", leading, leadingType: "icon" },
                    ]}
                />
                <ListItem headline="C" leading={leading} testId="plain" />
            </>,
        );
        const [thumbnail, icon] = document.querySelectorAll(
            '[data-testid="pf-list-item-leading"]',
        );
        const width = (element: Element) => getComputedStyle(element).width;
        expect(width(thumbnail!)).not.toBe(width(icon!));
        expect(width(icon!)).toBe(width(byTestId("plain-leading")));
    });

    it("renders a menu's groups after its items, with labels and supporting text", async () => {
        await render(
            <Menu
                items={[{ value: "new", label: "New" }]}
                groups={[
                    {
                        id: "edit",
                        label: "Edit",
                        items: [
                            {
                                value: "cut",
                                label: "Cut",
                                supportingText: "To the clipboard",
                            },
                        ],
                    },
                ]}
            />,
        );
        const group = byTestId("pf-menu-item-group");
        expect(group.getAttribute("role")).toBe("group");
        expect(byTestId("pf-menu-item-group-label").textContent).toBe("Edit");
        expect(byTestId("pf-menu-item-supporting-text").textContent).toBe(
            "To the clipboard",
        );
        expect(
            group.querySelector('[data-testid="pf-menu-item-content"]')!
                .textContent,
        ).toBe("CutTo the clipboard");
        expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    });

    it("toggles a checkbox item and fills it while checked", async () => {
        const changed = vi.fn();
        const Toggling = () => {
            const [checked, setChecked] = useState(false);
            return (
                <Menu
                    items={[
                        { value: "plain", label: "Plain" },
                        {
                            value: "italic",
                            label: "Italic",
                            type: "checkbox",
                            checked: true,
                        },
                        {
                            value: "bold",
                            label: "Bold",
                            type: "checkbox",
                            checked,
                            onCheckedChange: (next) => {
                                changed(next);
                                setChecked(next);
                            },
                        },
                    ]}
                />
            );
        };
        await render(<Toggling />);
        await pointerAway();
        const [italic, item] = document.querySelectorAll<HTMLElement>(
            '[role="menuitemcheckbox"]',
        );
        const fill = (element: Element) =>
            getComputedStyle(element).backgroundColor;
        const [plain] = document.querySelectorAll('[role="menuitem"]');
        expect(item!.getAttribute("aria-checked")).toBe("false");
        await until(() => {
            expect(fill(item!)).toBe(fill(plain!));
            expect(fill(italic!)).not.toBe(fill(plain!));
        });
        await interact(() => userEvent.click(item!));
        expect(changed).toHaveBeenCalledExactlyOnceWith(true);
        await pointerAway();
        await until(() => {
            expect(item!.getAttribute("aria-checked")).toBe("true");
            expect(fill(item!)).toBe(fill(italic!));
        });
    });

    it("takes the vibrant colors", async () => {
        await render(
            <>
                <Menu items={[{ value: "a", label: "A" }]} testId="plain" />
                <Menu
                    vibrant
                    items={[{ value: "a", label: "A" }]}
                    testId="vibrant"
                />
            </>,
        );
        expect(computed("vibrant-root").backgroundColor).not.toBe(
            computed("plain-root").backgroundColor,
        );
    });

    it("groups a select's options under their labels", async () => {
        await render(
            <Select
                label="Fruit"
                items={[
                    { value: "a", label: "Apple", group: "Pome" },
                    { value: "c", label: "Cherry", group: "Drupe" },
                    { value: "p", label: "Pear", group: "Pome" },
                ]}
            />,
        );
        await interact(() =>
            userEvent.click(document.querySelector('[role="combobox"]')!),
        );
        await settle(50);
        const groups = [
            ...document.querySelectorAll('[data-testid="pf-menu-item-group"]'),
        ];
        expect(groups.map((group) => group.textContent)).toEqual([
            "PomeApplePear",
            "DrupeCherry",
        ]);
    });
});
