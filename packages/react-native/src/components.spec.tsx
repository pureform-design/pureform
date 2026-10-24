import { act } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Dimensions, Image, Linking, View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Glyph, PureformProvider, useIconStyle } from ".";
import { AppBar } from "./app-bar";
import { Autocomplete } from "./autocomplete";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { Card } from "./card";
import { Checkbox } from "./checkbox";
import { Chip } from "./chip";
import { CircularProgress } from "./circular-progress";
import { Dialog } from "./dialog";
import { DragHandle } from "./drag-handle";
import { animated } from "./engine";
import { animatedSvg } from "./engines/svg";
import { Fab } from "./fab";
import { FileUpload } from "./file-upload";
import { FullscreenDialog } from "./fullscreen-dialog";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { LinearProgress } from "./linear-progress";
import { List } from "./list";
import { ListItem } from "./list-item";
import { LoadingIndicator } from "./loading-indicator";
import { Media } from "./media";
import { Menu } from "./menu";
import { NavigationBar } from "./navigation-bar";
import { NavigationRail } from "./navigation-rail";
import { Radio, RadioGroup } from "./radio-group";
import { RichTooltip } from "./rich-tooltip";
import { Scrim } from "./scrim";
import { SearchBar } from "./search-bar";
import { SearchView } from "./search-view";
import { Select } from "./select";
import { Separator } from "./separator";
import { SideSheet } from "./side-sheet";
import { Slider } from "./slider";
import { Snackbar } from "./snackbar";
import { Splitter } from "./splitter";
import { SupportingText } from "./supporting-text";
import { Switch } from "./switch";
import { Tabs } from "./tabs";
import { TagsInput } from "./tags-input";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import {
    byTestId,
    drag,
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
    "badge",
    "icon",
    "iconButton",
    "fab",
    "separator",
    "list",
    "listItem",
    "linearProgress",
    "circularProgress",
    "loadingIndicator",
    "scrim",
    "supportingText",
    "media",
    "textField",
    "textArea",
    "searchBar",
    "appBar",
    "select",
    "autocomplete",
    "searchView",
    "tagsInput",
    "fileUpload",
    "inputChip",
    "slider",
    "menu",
    "tabs",
    "navigationBar",
    "navigationRail",
    "dialog",
    "fullscreenDialog",
    "bottomSheet",
    "sideSheet",
    "dragHandle",
    "splitter",
    "snackbar",
    "tooltip",
    "richTooltip",
    "popover",
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
                <Badge>3</Badge>
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
                <LoadingIndicator aria-label="Loading" variant="contained" />
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
                <BottomSheet modal={false}>Share to</BottomSheet>
                <SideSheet
                    modal={false}
                    headline="Filters"
                    onBack={() => {}}
                    actions={<Button label="Apply" />}
                >
                    Narrow it down.
                </SideSheet>
                <DragHandle aria-label="Resize" orientation="vertical" />
                <Snackbar supportingText="Archived" action="Undo" />
                <Tooltip supportingText="Save" />
                <RichTooltip subhead="Drafts" supportingText="Saved" />
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
            "pf-badge-root",
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
            "pf-loading-indicator-indicator",
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
            "pf-bottom-sheet-root",
            "pf-bottom-sheet-drag-handle",
            "pf-bottom-sheet-content",
            "pf-side-sheet-header",
            "pf-side-sheet-back-button",
            "pf-side-sheet-headline",
            "pf-side-sheet-close-trigger",
            "pf-side-sheet-content",
            "pf-side-sheet-actions",
            "pf-drag-handle-root",
            "pf-drag-handle-handle",
            "pf-snackbar-close",
            "pf-tooltip-root",
            "pf-rich-tooltip-subhead",
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

describe("badge", () => {
    it("keeps its own size in a column rather than stretching across it, and in an anchored corner", async () => {
        await render(
            <View style={{ width: 400 }}>
                <Badge testId="count">3</Badge>
                <Badge size="small" testId="dot" />
                <View style={{ width: 24, height: 24 }}>
                    <Badge placement="anchored" testId="corner">
                        9
                    </Badge>
                </View>
            </View>,
        );
        const count = byTestId("count-root").getBoundingClientRect();
        expect(count.width).toBeLessThan(40);
        expect(count.height).toBe(16);
        expect(byTestId("dot-root").getBoundingClientRect().width).toBe(6);
        expect(
            byTestId("corner-root").getBoundingClientRect().width,
        ).toBeLessThan(40);
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

    it("toggles a button and a chip given defaultSelected, reported with aria-pressed", async () => {
        const button = vi.fn();
        const chip = vi.fn();
        await render(
            <View>
                <Button
                    label="Bold"
                    defaultSelected={false}
                    onSelectedChange={button}
                    testId="b"
                />
                <Chip label="Vegan" defaultSelected testId="c" />
                <Chip label="Plain" testId="p" onSelectedChange={chip} />
            </View>,
        );
        expect(byTestId("b-root").getAttribute("aria-pressed")).toBe("false");
        expect(byTestId("b-root").hasAttribute("aria-checked")).toBe(false);
        await interact(() => userEvent.click(byTestId("b-root")));
        expect(byTestId("b-root").getAttribute("aria-pressed")).toBe("true");
        expect(button).toHaveBeenCalledExactlyOnceWith({ selected: true });
        await interact(() => userEvent.click(byTestId("c-root")));
        expect(byTestId("c-root").getAttribute("aria-pressed")).toBe("false");
        // Not a filter chip: no pressed state, and a press flips nothing.
        expect(byTestId("p-root").hasAttribute("aria-pressed")).toBe(false);
        await interact(() => userEvent.click(byTestId("p-root")));
        expect(chip).not.toHaveBeenCalled();
    });

    it("checks a checkbox, a switch and a radio with Space on the web, and not with Enter", async () => {
        await render(
            <View>
                <Checkbox aria-label="Agree" />
                <Switch aria-label="Wi-Fi" />
                <RadioGroup
                    items={[{ value: "s", label: "Small", testId: "s" }]}
                />
            </View>,
        );
        for (const id of [
            "pf-checkbox-root",
            "pf-switch-control-root",
            "s-root",
        ]) {
            const root = byTestId(id);
            await interact(async () => {
                root.focus();
                await userEvent.keyboard("{Enter}");
            });
            expect(root.getAttribute("aria-checked")).toBe("false");
            await interact(() => userEvent.keyboard(" "));
            expect(root.getAttribute("aria-checked")).toBe("true");
        }
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
        const large = [...document.querySelectorAll('[role="option"]')].find(
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
        expect(byTestId("pf-text-field-counter").parentElement).toBe(
            byTestId("pf-text-field-root"),
        );
        const input = byTestId("pf-text-field-input") as HTMLInputElement;
        expect(input.getAttribute("aria-invalid")).not.toBe("true");
    });

    it("is labelled by its label, which a disabled field's input disables on the web", async () => {
        await render(<TextField label="Name" disabled />);
        const input = byTestId("pf-text-field-input") as HTMLInputElement;
        const label = byTestId("pf-text-field-label");
        expect(label.id).not.toBe("");
        expect(input.getAttribute("aria-labelledby")).toBe(label.id);
        expect(input.disabled).toBe(true);
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

describe("file upload", () => {
    const FILES = [
        { name: "a.txt", size: 2048 },
        { name: "big.png", errors: ["FILE_TOO_LARGE"] },
        { name: "c.pdf", size: 10, progress: 40 },
    ];

    it("lists each file with its size, its rejection, and its progress", async () => {
        await render(<FileUpload label="Files" files={FILES} />);
        const headlines = [
            ...document.querySelectorAll(
                '[data-testid="pf-list-item-headline"]',
            ),
        ].map((node) => node.textContent);
        expect(headlines).toEqual(["a.txt", "big.png", "c.pdf"]);
        // A list of list items, for assistive technology.
        expect(byTestId("pf-file-upload-item-group").getAttribute("role")).toBe(
            "list",
        );
        expect(byTestId("pf-file-upload-error").textContent).toBe(
            "The file is too large",
        );
        const bars = document.querySelectorAll('[role="progressbar"]');
        expect(bars).toHaveLength(1);
        expect(bars[0]?.getAttribute("aria-valuenow")).toBe("40");
    });

    it("asks the app to pick through the trigger, and to remove through a file's button", async () => {
        const picked = vi.fn();
        const removed = vi.fn();
        await render(
            <FileUpload
                label="Files"
                files={FILES.slice(0, 1)}
                onPick={picked}
                onRemove={removed}
            />,
        );
        await interact(() => byTestId("pf-button-root").click());
        expect(picked).toHaveBeenCalledOnce();
        await interact(() =>
            (
                document.querySelector(
                    '[aria-label="Remove a.txt"]',
                ) as HTMLElement
            ).click(),
        );
        expect(removed).toHaveBeenCalledWith(FILES[0]);
    });

    it("has no trigger without onPick, and shows an error message for the supporting text", async () => {
        await render(<FileUpload label="Files" error="Add a file" />);
        expect(
            document.querySelector('[data-testid="pf-button-root"]'),
        ).toBeNull();
        expect(byTestId("pf-file-upload-supporting-text").textContent).toBe(
            "Add a file",
        );
    });
});

describe("tags input", () => {
    const labels = () =>
        [
            ...document.querySelectorAll('[data-testid="pf-input-chip-label"]'),
        ].map((label) => label.textContent);
    const input = () => byTestId("pf-tags-input-input") as HTMLInputElement;

    it("renders a chip per value with its label and a named remove button", async () => {
        await render(<TagsInput label="Tags" defaultValue={["red", "blue"]} />);
        expect(labels()).toEqual(["red", "blue"]);
        expect(
            document.querySelector('[aria-label="Delete tag blue"]'),
        ).not.toBeNull();
    });

    it("adds the submitted text, skipping duplicates", async () => {
        const changes: string[][] = [];
        await render(
            <TagsInput
                label="Tags"
                defaultValue={["red"]}
                onValueChange={({ value }) => changes.push(value)}
            />,
        );
        await interact(() => userEvent.type(input(), " green {Enter}"));
        await interact(() => userEvent.type(input(), "red{Enter}"));
        expect(labels()).toEqual(["red", "green"]);
        expect(changes).toEqual([["red", "green"]]);
        await interact(() => userEvent.type(input(), "blue,"));
        expect(labels()).toEqual(["red", "green", "blue"]);
        expect(input().value).toBe("");
    });

    it("removes a chip by its remove button, and the last by Backspace", async () => {
        await render(
            <TagsInput label="Tags" defaultValue={["red", "green", "blue"]} />,
        );
        await interact(() =>
            (
                document.querySelector(
                    '[aria-label="Delete tag red"]',
                ) as HTMLElement
            ).click(),
        );
        expect(labels()).toEqual(["green", "blue"]);
        await interact(() => userEvent.type(input(), "{Backspace}"));
        expect(labels()).toEqual(["green"]);
    });

    it("floats the label while it holds a chip", async () => {
        await render(
            <>
                <TagsInput label="Tags" testId="empty" />
                <TagsInput label="Tags" testId="full" defaultValue={["red"]} />
            </>,
        );
        expect(computed("full-label").top).not.toBe(
            computed("empty-label").top,
        );
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

    it("makes an item with an href an interactive link, which a press opens", async () => {
        const open = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
        await render(
            <List
                items={[
                    { headline: "Inbox", href: "#inbox" },
                    { headline: "Sent" },
                ]}
            />,
        );
        const [link, row] = document.querySelectorAll<HTMLElement>(
            '[data-testid="pf-list-item-root"]',
        );
        expect(link!.getAttribute("role")).toBe("link");
        // In a list, the item around each row is the listitem, as the web's `<li>`.
        expect(row!.hasAttribute("role")).toBe(false);
        for (const item of [link!, row!])
            expect(item.parentElement!.getAttribute("role")).toBe("listitem");
        await userEvent.click(link!);
        expect(open).toHaveBeenCalledWith("#inbox");
        open.mockRestore();
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

    it("filters an autocomplete's suggestions as it's typed in, and picks one", async () => {
        const change = vi.fn();
        await render(
            <Autocomplete
                label="City"
                items={[
                    { value: "par", label: "Paris" },
                    { value: "pra", label: "Prague" },
                    { value: "rom", label: "Rome" },
                ]}
                onValueChange={change}
            />,
        );
        const input = byTestId("pf-autocomplete-input") as HTMLInputElement;
        await interact(() => userEvent.type(input, "pr"));
        await settle(50);
        const shown = () =>
            [...document.querySelectorAll('[role="menuitem"]')].map(
                (item) => item.textContent,
            );
        expect(shown()).toEqual(["Prague"]);
        expect(input.getAttribute("aria-expanded")).toBe("true");
        await interact(() =>
            userEvent.click(document.querySelector('[role="menuitem"]')!),
        );
        await settle(50);
        expect(change).toHaveBeenCalledExactlyOnceWith({ value: "pra" });
        expect(input.value).toBe("Prague");
        await until(() => expect(shown()).toEqual([]));
        await interact(() =>
            userEvent.click(
                document.querySelector('[aria-label="Show suggestions"]')!,
            ),
        );
        await settle(50);
        // It filters by what was typed only, as the web's: the chosen label shows them all.
        expect(shown()).toEqual(["Paris", "Prague", "Rome"]);
    });

    it("opens a search view, filters, selects, and closes", async () => {
        const select = vi.fn();
        const submit = vi.fn();
        await render(
            <SearchView
                placeholder="Search mail"
                items={[
                    { value: "a", label: "Alpha" },
                    { value: "b", label: "Beta" },
                ]}
                onSelect={select}
                onSubmit={submit}
            />,
        );
        const view = () => document.querySelector('[role="dialog"]');
        expect(view()).toBeNull();
        await interact(() =>
            userEvent.click(
                document.querySelector('[aria-haspopup="dialog"]')!,
            ),
        );
        await until(() => expect(view()).not.toBeNull());
        expect(byTestId("pf-search-view-root")).toBeTruthy();
        const input = byTestId("pf-search-view-input") as HTMLInputElement;
        await interact(() => userEvent.type(input, "be"));
        const shown = () =>
            [...document.querySelectorAll('[role="menuitem"]')].map(
                (item) => item.textContent,
            );
        expect(shown()).toEqual(["Beta"]);
        await interact(() =>
            userEvent.click(document.querySelector('[role="menuitem"]')!),
        );
        expect(select).toHaveBeenCalledExactlyOnceWith({
            value: "b",
            item: { value: "b", label: "Beta" },
        });
        await until(() => expect(view()).toBeNull());
        expect(
            (byTestId("pf-search-bar-input") as HTMLInputElement).value,
        ).toBe("Beta");
        // Submitting the query closes the view too.
        await interact(() =>
            userEvent.click(
                document.querySelector('[aria-haspopup="dialog"]')!,
            ),
        );
        await until(() => expect(view()).not.toBeNull());
        await interact(() =>
            userEvent.type(
                byTestId("pf-search-view-input") as HTMLInputElement,
                "{Enter}",
            ),
        );
        expect(submit).toHaveBeenCalledWith({ inputValue: "Beta" });
        await until(() => expect(view()).toBeNull());
    });

    it("draws its suggestions across the whole view, not in a menu's narrow surface", async () => {
        await render(
            <SearchView
                defaultOpen
                defaultInputValue="a"
                items={[{ value: "a", label: "Alpha" }]}
            />,
        );
        await until(() => byTestId("pf-search-view-content"));
        const content = byTestId("pf-search-view-content");
        const item = document.querySelector('[role="menuitem"]')!;
        expect(content.getBoundingClientRect().width).toBeGreaterThan(400);
        expect(item.getBoundingClientRect().width).toBeCloseTo(
            content.getBoundingClientRect().width,
            0,
        );
    });

    it("closes a search view from its back button", async () => {
        await render(<SearchView defaultOpen variant="docked" />);
        const view = () => document.querySelector('[role="dialog"]');
        await until(() => expect(view()).not.toBeNull());
        await interact(() =>
            userEvent.click(document.querySelector('[aria-label="Back"]')!),
        );
        await until(() => expect(view()).toBeNull());
    });
});

describe("app bar", () => {
    const children = () =>
        [...byTestId("bar-root").children].map((child) =>
            child.getAttribute("data-testid"),
        );

    it("lays out its parts, and puts an expanded flexible bar's headline last", async () => {
        const offset = outside(0);
        await render(
            <offset.Holder>
                {(current) => (
                    <AppBar
                        size="largeFlexible"
                        leading={
                            <IconButton
                                aria-label="Back"
                                icon={<Glyph glyph="←" />}
                            />
                        }
                        headline="Inbox"
                        subtitle="12 unread"
                        scrollOffset={current}
                        testId="bar"
                    />
                )}
            </offset.Holder>,
        );
        expect(children()).toEqual([
            "bar-leading",
            "bar-trailing",
            "bar-content",
        ]);
        expect(byTestId("bar-headline").textContent).toBe("Inbox");
        const resting = computed("bar-root").backgroundColor;
        await offset.set(10);
        await until(() =>
            expect(computed("bar-root").backgroundColor).not.toBe(resting),
        );
        await offset.set(200);
        expect(children()).toEqual([
            "bar-leading",
            "bar-content",
            "bar-trailing",
        ]);
    });

    it("holds a search bar, drawn scrolled with the bar", async () => {
        await render(
            <>
                <AppBar searchBar={{}} scrolled testId="bar" />
                <SearchBar testId="plain" />
                <SearchBar scrolled testId="scrolled" />
            </>,
        );
        await pointerAway();
        expect(
            byTestId("bar-content").contains(byTestId("pf-search-bar-root")),
        ).toBe(true);
        await until(() =>
            expect(computed("pf-search-bar-root").backgroundColor).toBe(
                computed("scrolled-root").backgroundColor,
            ),
        );
    });
});

describe("nested rows", () => {
    it("expands a list item with a region, its indicator turning over", async () => {
        const seen: boolean[] = [];
        await render(
            <ListItem
                headline="Folders"
                region={<ListItem headline="Work" testId="work" />}
                onExpandedChange={({ expanded }) => seen.push(expanded)}
                testId="folders"
            />,
        );
        const root = byTestId("folders-root");
        expect(root.getAttribute("role")).toBe("button");
        expect(root.getAttribute("aria-expanded")).toBe("false");
        expect(byTestId("folders-indicator").textContent).toBe("⌄");
        expect(document.querySelector('[data-testid="folders-region"]')).toBe(
            null,
        );
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId("folders-region").contains(byTestId("work-root"))).toBe(
            true,
        );
        expect(byTestId("work-root").getAttribute("role")).toBe("listitem");
        expect(seen).toEqual([true]);
    });

    it("drills into a menu item's submenu, and back out", async () => {
        const onSelect = vi.fn();
        await render(
            <Menu
                submenu="drill"
                items={[
                    { value: "cut", label: "Cut" },
                    {
                        value: "share",
                        label: "Share",
                        items: [{ value: "mail", label: "Mail" }],
                    },
                ]}
                onSelect={onSelect}
            />,
        );
        const labels = () =>
            [...document.querySelectorAll('[role="menuitem"]')].map(
                (item) => item.textContent,
            );
        expect(labels()).toEqual(["Cut", "Share›"]);
        const share =
            document.querySelectorAll<HTMLElement>('[role="menuitem"]')[1]!;
        await interact(() => userEvent.click(share));
        expect(labels()).toEqual(["‹Share", "Mail"]);
        expect(onSelect).not.toHaveBeenCalled();
        const [back, mail] =
            document.querySelectorAll<HTMLElement>('[role="menuitem"]');
        await interact(() => userEvent.click(mail!));
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "mail" });
        await interact(() => userEvent.click(back!));
        expect(labels()).toEqual(["Cut", "Share›"]);
    });

    const SHARE = [
        { value: "cut", label: "Cut" },
        {
            value: "share",
            label: "Share",
            items: [{ value: "mail", label: "Mail" }],
        },
    ];
    const menuLabels = () =>
        [...document.querySelectorAll('[role="menuitem"]')].map(
            (item) => item.textContent,
        );

    it("cascades a menu item's submenu beside its row", async () => {
        const onSelect = vi.fn();
        await render(
            <Menu submenu="cascade" items={SHARE} onSelect={onSelect} />,
        );
        const share =
            document.querySelectorAll<HTMLElement>('[role="menuitem"]')[1]!;
        await interact(() => userEvent.click(share));
        await until(() =>
            expect(menuLabels()).toEqual(["Cut", "Share›", "Mail"]),
        );
        const menus = [...document.querySelectorAll('[role="menu"]')];
        expect(menus).toHaveLength(2);
        const row = share.getBoundingClientRect();
        await until(() => {
            const beside = menus[1]!.getBoundingClientRect();
            // Beside the row, at its top (or flipped before it, without room after).
            expect(
                Math.abs(beside.left - row.right) < 1 ||
                    Math.abs(beside.right - row.left) < 1,
            ).toBe(true);
        });
        const mail = [
            ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
        ].find((item) => item.textContent === "Mail")!;
        await interact(() => userEvent.click(mail));
        expect(onSelect).toHaveBeenCalledExactlyOnceWith({ value: "mail" });
        // Picking an item puts the submenu away; pressing its row again does too.
        await until(() => expect(menuLabels()).toEqual(["Cut", "Share›"]));
    });

    // Full motion, slowed, so a test sees a step part way.
    const moving = (node: ReactNode) =>
        mount(
            <PureformProvider
                registry={registry}
                engine={animated}
                motion="full"
                timeScale={10}
            >
                <View style={{ width: 400 }}>{node}</View>
            </PureformProvider>,
        );
    const rows = () => [
        ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ];

    it("grows a cascaded submenu in as the menu does, and fades it out", async () => {
        await moving(<Menu submenu="cascade" items={SHARE} />);
        await interact(() => userEvent.click(rows()[1]!));
        await until(() =>
            expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2),
        );
        const moved = () =>
            document.querySelectorAll('[role="menu"]')[1]!.parentElement!
                .parentElement!;
        // Part way in: faded and scaled, from its row's side.
        expect(Number(getComputedStyle(moved()).opacity)).toBeLessThan(1);
        // Pressing the row again puts it away: it stays while it fades.
        await interact(() => userEvent.click(rows()[1]!));
        expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2);
        expect(getComputedStyle(moved()).pointerEvents).toBe("none");
    });

    it("springs a drilled menu's size to the new level, moves the pressed label into the header's, and fades the other rows in", async () => {
        const deep = [
            ...SHARE.slice(0, 1),
            {
                value: "share",
                label: "Share",
                items: ["mail", "link", "print a copy of this page"].map(
                    (value) => ({
                        value,
                        label: value,
                    }),
                ),
            },
        ];
        await moving(
            <View style={{ alignItems: "flex-start" }}>
                <Menu submenu="drill" items={deep} />
            </View>,
        );
        const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
        const box = () => menu.getBoundingClientRect();
        const [before, beforeWidth] = [box().height, box().width];
        const labelOf = (row: HTMLElement) =>
            row.querySelector<HTMLElement>(
                '[data-testid="pf-menu-item-label"]',
            )!;
        const share = labelOf(rows()[1]!).getBoundingClientRect().top;
        await interact(() => userEvent.click(rows()[1]!));
        await until(() => expect(rows()[0]!.textContent).toBe("‹Share"));
        // The header's row is in its place; only its label starts where the pressed one was.
        const header = rows()[0]!;
        expect(header.getBoundingClientRect().top - box().top).toBeLessThan(9);
        const label = labelOf(header).getBoundingClientRect().top;
        expect(Math.abs(label - share)).toBeLessThan(
            Math.abs(header.getBoundingClientRect().top - share),
        );
        // The other rows fade in.
        const opacity = (row: HTMLElement) =>
            Number(getComputedStyle(row.parentElement!).opacity);
        expect(opacity(rows()[1]!)).toBeLessThan(1);
        // Two rows to four, and wider: part way between.
        expect(box().height).toBeLessThan(before * 2 - 1);
        const midWidth = box().width;
        // At rest: the new level's own size, every label in place and every row shown.
        await until(() => {
            expect(
                labelOf(rows()[0]!).getBoundingClientRect().top -
                    rows()[0]!.getBoundingClientRect().top,
            ).toBeLessThan(20);
            expect(opacity(rows()[1]!)).toBe(1);
        }, 5000);
        await until(
            () => expect(box().height).toBeGreaterThan(before * 1.5),
            5000,
        );
        expect(box().width).toBeGreaterThan(beforeWidth);
        expect(midWidth).toBeLessThan(box().width);
    });

    it("cascades by default when a submenu fits beside the menu, and drills when it doesn't", async () => {
        const centered = (
            <View style={{ alignItems: "center" }}>
                <Menu items={SHARE} />
            </View>
        );
        const openShare = () =>
            interact(() =>
                userEvent.click(
                    document.querySelectorAll<HTMLElement>(
                        '[role="menuitem"]',
                    )[1]!,
                ),
            );
        try {
            await page.viewport(1000, 800);
            await render(centered);
            await settle(100);
            await openShare();
            await until(() =>
                expect(menuLabels()).toEqual(["Cut", "Share›", "Mail"]),
            );
            document.body.innerHTML = "";
            // A centred menu at least 112 wide in a 320-wide window: less than its width either side.
            await page.viewport(320, 800);
            // React Native Web hears the window's resize a moment later.
            await until(() => expect(Dimensions.get("window").width).toBe(320));
            await render(centered);
            await settle(100);
            await openShare();
            await until(() => expect(menuLabels()).toEqual(["‹Share", "Mail"]));
        } finally {
            await page.viewport(414, 896);
        }
    });

    it("shows an expanded rail's section headings", async () => {
        await render(
            <NavigationRail
                items={DESTINATIONS.map((item) => ({
                    ...item,
                    section: "Mail",
                }))}
                expanded
                testId="s"
            />,
        );
        expect(byTestId("s-section-label").textContent).toBe("Mail");
        expect(computed("s-section-label").display).toBe("flex");
    });

    it("swipes an expandable item too: its action after the button, in a frame", async () => {
        await render(
            <ListItem
                headline="Folders"
                region={<ListItem headline="Work" />}
                swipeAction={<Glyph glyph="🗑" />}
                testId="both"
            />,
        );
        const root = byTestId("both-root");
        expect(root.getAttribute("role")).toBe("button");
        expect(root.getAttribute("aria-expanded")).toBe("false");
        const frame = byTestId("both-frame");
        expect([...frame.children]).toEqual([root, byTestId("both-action")]);
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-expanded")).toBe("true");
        expect(byTestId("both-region")).toBeTruthy();
    });

    it("presses a swipeable item on a tap, not a drag, and isolates its frame", async () => {
        const onPress = vi.fn();
        const onRevealedChange = vi.fn();
        await render(
            <ListItem
                headline="Message"
                swipeAction={<Glyph glyph="🗑" />}
                onPress={onPress}
                onRevealedChange={onRevealedChange}
                testId="tap"
            />,
        );
        const root = byTestId("tap-root");
        expect(root.getAttribute("role")).toBe("button");
        expect(computed("tap-frame").isolation).toBe("isolate");
        await interact(() => userEvent.click(root));
        expect(onPress).toHaveBeenCalledTimes(1);
        const release = await drag(
            root,
            [-10, -40, -80, -120].map((dx) => [dx, 0] as const),
        );
        await release();
        expect(onRevealedChange).toHaveBeenCalledWith({ revealed: true });
        expect(onPress).toHaveBeenCalledTimes(1);
    });
});

describe("c7c: avatar picture, swipe, inset icon, search bar width", () => {
    const GIF =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    it("shows an avatar's fallback until its picture loads, and keeps it when it fails", async () => {
        const onStatusChange = vi.fn();
        await render(
            <>
                <Avatar
                    label="Ada"
                    src={GIF}
                    onStatusChange={onStatusChange}
                    testId="ok"
                >
                    AL
                </Avatar>
                <Avatar label="Bo" src="/no-such-avatar.png" testId="broken">
                    BO
                </Avatar>
            </>,
        );
        await until(() =>
            expect(onStatusChange).toHaveBeenCalledWith({ status: "loaded" }),
        );
        expect(
            document.querySelector('[data-testid="ok-fallback"]'),
        ).toBeNull();
        await until(() =>
            expect(byTestId("broken-fallback").textContent).toBe("BO"),
        );
    });

    it("names an avatar as an image by its label, and hides one without", async () => {
        await render(
            <>
                <Avatar label="Ada" testId="named">
                    AL
                </Avatar>
                <Avatar testId="decorative">AL</Avatar>
            </>,
        );
        const named = byTestId("named-root");
        expect(named.tagName).not.toBe("IMG");
        expect(named.getAttribute("role")).toBe("img");
        expect(named.getAttribute("aria-label")).toBe("Ada");
        expect(byTestId("decorative-root").getAttribute("role")).toBe(null);
        expect(byTestId("decorative-root").getAttribute("aria-hidden")).toBe(
            "true",
        );
    });

    it("slides a swipeable list item's parts and reveals its action", async () => {
        await render(
            <ListItem
                headline="Message"
                swipeAction={<Glyph glyph="🗑" />}
                defaultRevealed
                testId="row"
            />,
        );
        await pointerAway();
        expect(byTestId("row-action")).toBeTruthy();
        await until(() =>
            expect(computed("row-headline").width).not.toBe("0px"),
        );
        const closed = (
            <ListItem
                headline="Message"
                swipeAction={<Glyph glyph="🗑" />}
                testId="closed"
            />
        );
        await render(closed);
        // A destructive action takes the error container.
        await render(
            <ListItem
                headline="Message"
                swipeAction={<Glyph glyph="🗑" />}
                actionColor="error"
                testId="error"
            />,
        );
        expect(computed("error-action").backgroundColor).not.toBe(
            computed("closed-action").backgroundColor,
        );
        expect(byTestId("closed-action").getAttribute("aria-hidden")).toBe(
            "true",
        );
    });

    it("draws a slider's inset icon, and caps a search bar's width", async () => {
        await render(
            <View style={{ width: 1200 }}>
                <Slider
                    aria-label="Volume"
                    size="large"
                    defaultValue={40}
                    insetIcon={<Glyph glyph="♪" />}
                    testId="vol"
                />
                <Slider
                    aria-label="Bass"
                    size="large"
                    defaultValue={2}
                    insetIcon={<Glyph glyph="♪" />}
                    testId="low"
                />
                <SearchBar testId="wide" />
            </View>,
        );
        expect(byTestId("vol-inset-icon").textContent).toBe("♪");
        // Too short an active track: the icon moves past the handle, in the inactive track's
        // content colour, never across the boundary.
        await until(() =>
            expect(computed("low-inset-icon").color).not.toBe(
                computed("vol-inset-icon").color,
            ),
        );
        const low = byTestId("low-inset-icon").getBoundingClientRect();
        const active = byTestId("low-active-track").getBoundingClientRect();
        expect(low.left).toBeGreaterThanOrEqual(active.right);
        await until(() => expect(computed("wide-root").maxWidth).toBe("720px"));
        // Flat: Compose's search bar has no shadow (level 0).
        expect(computed("wide-root").boxShadow).toBe("none");
    });

    it("cuts a slider's inset icon off by the theme's handle clearance", async () => {
        // 13% of 400px is 52px: less the default 8px clearance the icon fits (44 ≥ 40), less a
        // theme's 14px it doesn't (38).
        const slider = (testId: string) => (
            <View style={{ width: 400 }}>
                <Slider
                    aria-label="Volume"
                    size="large"
                    defaultValue={13}
                    insetIcon={<Glyph glyph="♪" />}
                    testId={testId}
                />
            </View>
        );
        await render(
            <>
                {slider("default")}
                <PureformProvider
                    overrides={{ "components.slider.handleClearance": 14 }}
                >
                    {slider("themed")}
                </PureformProvider>
            </>,
        );
        const from = (testId: string, part: string) =>
            byTestId(`${testId}-${part}`).getBoundingClientRect().left -
            byTestId(`${testId}-root`).getBoundingClientRect().left;
        await until(() => {
            expect(from("themed", "track")).toBeCloseTo(52 + 14, 0);
            expect(from("themed", "inset-icon")).toBeCloseTo(52 + 14 + 10, 0);
        });
        expect(from("default", "inset-icon")).toBeCloseTo(10, 0);
    });
});

describe("c8c: splitter", () => {
    const panes = [
        { id: "list", content: <Text>List</Text> },
        { id: "detail", content: <Text>Detail</Text> },
    ];
    const width = (element: HTMLElement) =>
        element.getBoundingClientRect().width;
    const panels = () => [
        ...document.querySelectorAll<HTMLElement>(
            '[data-testid="pf-splitter-panel"]',
        ),
    ];
    // The splitter takes its room from `onLayout`, which can land a frame after the panes are
    // laid out; a drag before it moves nothing. Under load (the whole file), that frame is late.
    const measured = async () => {
        for (let frame = 0; frame < 2; frame++)
            await new Promise(requestAnimationFrame);
    };

    it("draws a string pane as text, and fills its parent when stacked", async () => {
        await render(
            <View style={{ width: 400, height: 300 }}>
                <Splitter
                    orientation="vertical"
                    panes={[
                        { id: "list", content: "List" },
                        { id: "detail", content: "Detail" },
                    ]}
                />
            </View>,
        );
        await until(() =>
            expect(
                byTestId("pf-splitter-root").getBoundingClientRect().height,
            ).toBe(300),
        );
        expect(panels().map((panel) => panel.textContent)).toEqual([
            "List",
            "Detail",
        ]);
        const height = (element: HTMLElement) =>
            element.getBoundingClientRect().height;
        await until(() =>
            expect(height(panels()[0]!)).toBeCloseTo(height(panels()[1]!), 0),
        );
        expect(height(panels()[0]!)).toBeGreaterThan(100);
    });

    it("lays its panes out with a 24px divider holding Compose's 4×48 pill", async () => {
        await render(
            <View style={{ width: 1024, height: 200 }}>
                <Splitter
                    panes={panes}
                    defaultSize={[30, 70]}
                    resizeLabel="Resize list"
                />
            </View>,
        );
        const trigger = byTestId("pf-splitter-resize-trigger");
        const pill = byTestId("pf-splitter-resize-trigger-indicator");
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(300, 0));
        expect(width(trigger)).toBe(24);
        expect(width(pill)).toBe(4);
        expect(pill.getBoundingClientRect().height).toBe(48);
        expect(trigger.getAttribute("aria-label")).toBe("Resize list");
    });

    it("grows its pill while dragged and snaps the divider to the nearest anchor", async () => {
        const changes: number[][] = [];
        await render(
            <View style={{ width: 1024, height: 200 }}>
                <Splitter
                    panes={panes}
                    defaultSize={[30, 70]}
                    onSizeChange={({ size }) => changes.push(size)}
                />
            </View>,
        );
        const trigger = byTestId("pf-splitter-resize-trigger");
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(300, 0));
        await measured();
        const release = await drag(trigger, [
            [50, 0],
            [100, 0],
            [150, 0],
        ]);
        // Grown while it's held, as Compose's pressed handle.
        await until(() =>
            expect(
                width(byTestId("pf-splitter-resize-trigger-indicator")),
            ).toBe(12),
        );
        await release();
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(500, 0));
        expect(changes.at(-1)![0]).toBeCloseTo(50, 1);
    });

    it("settles the snap on a spring, reporting the snapped sizes once", async () => {
        const changes: number[][] = [];
        await mount(
            <PureformProvider
                registry={registry}
                engine={animated}
                motion="full"
            >
                <View style={{ width: 1024, height: 200 }}>
                    <Splitter
                        panes={panes}
                        defaultSize={[30, 70]}
                        onSizeChange={({ size }) => changes.push(size)}
                    />
                </View>
            </PureformProvider>,
        );
        const trigger = byTestId("pf-splitter-resize-trigger");
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(300, 0));
        await measured();
        await (
            await drag(trigger, [
                [50, 0],
                [100, 0],
                [150, 0],
            ])
        )();
        const dragged = changes.length;
        // Committed at once, while the panes are still on their way.
        expect(changes.at(-1)![0]).toBeCloseTo(50, 1);
        const seen: number[] = [];
        for (let frame = 0; frame < 10; frame++) {
            seen.push(width(panels()[0]!));
            await new Promise(requestAnimationFrame);
        }
        expect(seen.some((at) => Math.abs(at - 500) > 0.5)).toBe(true);
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(500, 0));
        expect(changes.length).toBe(dragged);
        expect(width(panels()[0]!) + width(panels()[1]!)).toBeCloseTo(1000, 0);
    });

    it("rests where it's let go without anchors, and stops at a pane's least size", async () => {
        await render(
            <View style={{ width: 1024, height: 200 }}>
                <Splitter
                    panes={[{ ...panes[0]!, minSize: "200px" }, panes[1]!]}
                    anchors={[]}
                    defaultSize={[30, 70]}
                />
            </View>,
        );
        const trigger = byTestId("pf-splitter-resize-trigger");
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(300, 0));
        await measured();
        await (
            await drag(trigger, [
                [50, 0],
                [150, 0],
            ])
        )();
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(450, 0));
        await (
            await drag(trigger, [
                [-200, 0],
                [-400, 0],
            ])
        )();
        await until(() => expect(width(panels()[0]!)).toBeCloseTo(200, 0));
    });
});

describe("media", () => {
    const PICTURE = `data:image/svg+xml,${encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='30'><rect width='40' height='30' fill='teal'/></svg>",
    )}`;

    it("takes `src` as the web does, at its own proportions at `auto` and the aspect's otherwise", async () => {
        await render(
            <View style={{ width: 200 }}>
                <Media src={PICTURE} alt="A teal square" testId="auto" />
                <Media src={PICTURE} aspect="square" testId="square" />
            </View>,
        );
        const box = (id: string) =>
            byTestId(`${id}-root`).getBoundingClientRect();
        await until(() => expect(box("auto").height).toBeCloseTo(150, 0));
        expect(box("auto").width).toBe(200);
        expect(box("square").height).toBe(200);
    });

    const box = (id: string) => byTestId(`${id}-root`).getBoundingClientRect();

    it("takes a source's own size and an array's first, without loading it", async () => {
        const getSize = vi.spyOn(Image, "getSize");
        await render(
            <View style={{ width: 200 }}>
                <Media
                    source={{ uri: PICTURE, width: 40, height: 20 }}
                    testId="sized"
                />
                <Media
                    source={[
                        { uri: PICTURE, width: 40, height: 10 },
                        { uri: PICTURE, width: 80, height: 20 },
                    ]}
                    testId="resolutions"
                />
            </View>,
        );
        expect(box("sized").height).toBeCloseTo(100, 0);
        expect(box("resolutions").height).toBeCloseTo(50, 0);
        expect(getSize).not.toHaveBeenCalled();
        getSize.mockRestore();
    });

    it("measures a remote source with its headers where React Native can", async () => {
        const headers = { Authorization: "Bearer token" };
        const withHeaders = vi.fn(
            (
                _uri: string,
                _headers: Record<string, string>,
                done: (width: number, height: number) => void,
            ) => done(40, 10),
        );
        const statics = Image as unknown as {
            getSizeWithHeaders?: typeof withHeaders | undefined;
        };
        const before = statics.getSizeWithHeaders;
        statics.getSizeWithHeaders = withHeaders;
        try {
            await render(
                <View style={{ width: 200 }}>
                    <Media
                        source={{ uri: PICTURE, headers, cache: "reload" }}
                        testId="remote"
                    />
                </View>,
            );
            await until(() => expect(box("remote").height).toBeCloseTo(50, 0));
            expect(withHeaders).toHaveBeenCalledWith(
                PICTURE,
                headers,
                expect.any(Function),
                expect.any(Function),
            );
        } finally {
            statics.getSizeWithHeaders = before;
        }
    });

    it("takes a bundled asset's size from the bundler", async () => {
        const statics = Image as unknown as {
            resolveAssetSource?: ((source: number) => object) | undefined;
        };
        const before = statics.resolveAssetSource;
        statics.resolveAssetSource = () => ({
            uri: PICTURE,
            width: 40,
            height: 40,
        });
        try {
            // React Native Web's registry, which a bundler's `require()` of a picture fills.
            const assets = (globalThis as Record<symbol, object[]>)[
                Symbol.for("react-native-web.AssetRegistry")
            ]!;
            const id = assets.push({
                httpServerLocation: "/assets",
                name: "picture",
                type: "png",
                width: 40,
                height: 40,
                scales: [1],
            });
            await render(
                <View style={{ width: 200 }}>
                    <Media source={id} testId="asset" />
                </View>,
            );
            expect(box("asset").height).toBeCloseTo(200, 0);
        } finally {
            statics.resolveAssetSource = before;
        }
    });

    it("draws a shaped picture from the whole source", async () => {
        await mount(
            <PureformProvider registry={registry} engine={animatedSvg}>
                <View style={{ width: 200 }}>
                    <Media
                        source={{ uri: PICTURE, width: 40, height: 40 }}
                        shape="cookie4Sided"
                        testId="shaped"
                    />
                </View>
            </PureformProvider>,
        );
        await until(() =>
            expect(
                byTestId("shaped-root")
                    .querySelector("image")
                    ?.getAttribute("href"),
            ).toBe(PICTURE),
        );
        expect(box("shaped").height).toBeCloseTo(200, 0);
    });

    it("prefers `source` over `src`, and warns in development", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        await render(
            <View style={{ width: 200 }}>
                <Media
                    src="data:,"
                    source={{ uri: PICTURE, width: 40, height: 10 }}
                    testId="both"
                />
            </View>,
        );
        expect(box("both").height).toBeCloseTo(50, 0);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("`source` wins"),
        );
        warn.mockRestore();
    });
});

describe("standard bottom sheet", () => {
    it("draws its trigger and its body, open in place, and a drag handle press closes it", async () => {
        await render(
            <View style={{ width: 400, height: 400 }}>
                <BottomSheet
                    modal={false}
                    defaultOpen
                    trigger="Share"
                    aria-label="Share"
                    body="Send it to a friend."
                />
            </View>,
        );
        expect(byTestId("pf-button-root").textContent).toBe("Share");
        expect(byTestId("pf-bottom-sheet-content").textContent).toBe(
            "Send it to a friend.",
        );
        await interact(() => userEvent.click(byTestId("pf-drag-handle-root")));
        await until(() =>
            expect(
                document.querySelector('[data-testid="pf-bottom-sheet-root"]'),
            ).toBeNull(),
        );
        await interact(() => userEvent.click(byTestId("pf-button-root")));
        await until(() =>
            expect(
                document.querySelector('[data-testid="pf-bottom-sheet-root"]'),
            ).not.toBeNull(),
        );
    });
});

describe("badge in flow", () => {
    it("keeps its own width in a column", async () => {
        await render(
            <View style={{ width: 400 }}>
                <Badge testId="count">999+</Badge>
            </View>,
        );
        const box = byTestId("count-root").getBoundingClientRect();
        expect(box.width).toBeLessThan(48);
        expect(box.height).toBe(16);
    });
});

describe("inline roots in flow", () => {
    // Each root keeps its own size (`OWN_SIZE`: `width: "fit-content"`), so its parent's
    // `alignItems` places it, as the web's `inline-flex` root.
    const roots = (style?: { width?: string; alignSelf?: "stretch" }) => (
        <>
            <Button label="Save" style={style} testId="button" />
            <IconButton
                aria-label="Edit"
                icon={<Glyph glyph="✎" />}
                style={style}
                testId="icon"
            />
            <Fab
                icon={<Glyph glyph="+" />}
                label="Compose"
                style={style}
                testId="fab"
            />
            <Chip label="Nearby" style={style} testId="chip" />
            <Checkbox aria-label="Agree" style={style} testId="checkbox" />
            <Switch aria-label="Wi-Fi" style={style} testId="switch" />
            <Radio aria-label="On" style={style} testId="radio" />
            <Badge style={style} testId="badge">
                3
            </Badge>
        </>
    );
    const IDS = [
        "button",
        "icon",
        "fab",
        "chip",
        "checkbox",
        "switch",
        "radio",
        "badge",
    ];
    const box = (id: string) => byTestId(`${id}-root`).getBoundingClientRect();

    it("keep their own width in a column, at its start, as the web's do", async () => {
        await render(<View style={{ width: 400 }}>{roots()}</View>);
        const column = byTestId("button-root").parentElement!;
        const left = column.getBoundingClientRect().left;
        for (const id of IDS) {
            expect(box(id).width, id).toBeLessThan(200);
            expect(box(id).left, id).toBeCloseTo(left, 0);
        }
    });

    it("follow a centred column's alignment", async () => {
        await render(
            <View style={{ width: 400, alignItems: "center" }} testID="column">
                {roots()}
            </View>,
        );
        const column = byTestId("column").getBoundingClientRect();
        for (const id of IDS) {
            const own = box(id);
            expect(own.width, id).toBeLessThan(200);
            expect(own.left - column.left, id).toBeCloseTo(
                column.right - own.right,
                0,
            );
        }
    });

    it("follow a centred row's alignment", async () => {
        await render(
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 120,
                }}
                testID="row"
            >
                {roots()}
            </View>,
        );
        const row = byTestId("row").getBoundingClientRect();
        for (const id of IDS) {
            const own = box(id);
            expect(own.top - row.top, id).toBeCloseTo(
                row.bottom - own.bottom,
                0,
            );
        }
    });

    it("take a user's width, and keep their own with alignSelf stretch alone", async () => {
        await render(
            <View style={{ width: 400 }}>
                <View testID="full">{roots({ width: "100%" })}</View>
                <View testID="stretch">{roots({ alignSelf: "stretch" })}</View>
            </View>,
        );
        const full = byTestId("full");
        for (const id of IDS) {
            const own = full
                .querySelector(`[data-testid="${id}-root"]`)!
                .getBoundingClientRect();
            expect(own.width, id).toBeCloseTo(400, 0);
        }
        const stretch = byTestId("stretch");
        for (const id of IDS) {
            const own = stretch
                .querySelector(`[data-testid="${id}-root"]`)!
                .getBoundingClientRect();
            expect(own.width, id).toBeLessThan(200);
        }
    });
});
