import { dialogOverlayAnatomy } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { animated } from "./engine";
import { List } from "./list";
import { nativeSlots, overlayKeys } from "./slot-props";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, computed, interact, mount, settle } from "./testing/render";
import { TextField } from "./text-field";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "button",
        "dialog",
        "scrim",
        "list",
        "listItem",
        "textField",
        "ripple",
    ]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} engine={animated} motion="reduce">
            <View style={{ width: 600, height: 400 }}>{node}</View>
        </PureformProvider>,
    );

describe("nativeSlots", () => {
    it("changes nothing, and builds nothing, without style or slotProps", () => {
        const own = { margin: 1 };
        const slots = nativeSlots({});
        expect(slots).toBe(nativeSlots(undefined));
        expect(slots.style("root", own)).toBe(own);
        const press = () => {};
        expect(slots.on("root", "onPress", press)).toBe(press);
    });

    it("merges a part's style over its own, the same object while both stay", () => {
        const own = { margin: 1, padding: 2 };
        const props = { style: { root: { padding: 4 } } };
        const merged = nativeSlots(props).style("root", own);
        expect(merged).toEqual({ margin: 1, padding: 4 });
        expect(nativeSlots(props)).toBe(nativeSlots(props));
        expect(nativeSlots(props).style("root", own)).toBe(merged);
        expect(nativeSlots(props).style("label", own)).toBe(own);
    });

    it("composes handlers, the component's first, and keeps its measuring onLayout", () => {
        const calls: string[] = [];
        const user = () => calls.push("user");
        const own = () => calls.push("own");
        const slots = nativeSlots({
            slotProps: { root: { onPress: user, onLayout: user } },
        });
        slots.on("root", "onPress", own)();
        expect(calls).toEqual(["own", "user"]);
        expect(slots.on("root", "onLayout", own)).toBe(own);
        expect(slots.on("root", "onPress", undefined)).toBe(user);
        expect(slots.on("root", "onPress", own)).toBe(
            slots.on("root", "onPress", own),
        );
    });

    it("names an overlay's parts as the web does", () => {
        const keyOf = overlayKeys(dialogOverlayAnatomy);
        expect(keyOf("root")).toBe("content");
        expect(keyOf("headline")).toBe("headline");
    });
});

describe("keyed style and slotProps", () => {
    it("style a button's parts, and its props compose with its own", async () => {
        const pressed: string[] = [];
        await render(
            <Button
                label="Save"
                onPress={() => pressed.push("own")}
                style={{
                    root: { marginTop: 7 },
                    label: { fontStyle: "italic" },
                }}
                slotProps={{
                    root: {
                        onPress: () => pressed.push("user"),
                        // The component's state wins.
                        disabled: true,
                    },
                    label: { numberOfLines: 1 },
                }}
                testId="save"
            />,
        );
        expect(computed("save-root").marginTop).toBe("7px");
        expect(computed("save-label").fontStyle).toBe("italic");
        await interact(() => userEvent.click(byTestId("save-root")));
        expect(pressed).toEqual(["own", "user"]);
    });

    it("reach a dialog's surface as `content`, and its scrim as `backdrop`", async () => {
        await render(
            <Dialog
                defaultOpen
                headline="Discard draft?"
                style={{
                    content: { marginTop: 3 },
                    backdrop: { opacity: 0.25 },
                }}
                testId={{ backdrop: "dim" }}
            >
                Gone.
            </Dialog>,
        );
        await settle(600);
        expect(computed("pf-dialog-content").marginTop).toBe("3px");
        expect(computed("dim").opacity).toBe("0.25");
    });

    it("reach a list's items through listItemProps, under each item's own", async () => {
        await render(
            <List
                style={{ item: { marginTop: 5 } }}
                listItemProps={{ style: { headline: { fontStyle: "italic" } } }}
                items={[{ headline: "Inbox", testId: "inbox" }]}
            />,
        );
        expect(computed("pf-list-item").marginTop).toBe("5px");
        expect(computed("inbox-headline").fontStyle).toBe("italic");
    });

    it("take a text field's TextInput props as `slotProps.input`", async () => {
        await render(
            <TextField
                label="Name"
                slotProps={{ input: { placeholder: "Ada", maxLength: 4 } }}
                testId="name"
            />,
        );
        expect(byTestId("name-input").getAttribute("maxlength")).toBe("4");
    });
});
