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
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { LinearProgress } from "./linear-progress";
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
import { byTestId, computed, interact, mount, settle } from "./testing/render";
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
});

describe("icons", () => {
    it("give an icon its slot's size and color", async () => {
        let style: ReturnType<typeof useIconStyle> | undefined;
        function Probe() {
            style = useIconStyle();
            return null;
        }
        await render(<Button label="Add" icon={<Probe />} />);
        expect(style!.size).toBe(18);
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
