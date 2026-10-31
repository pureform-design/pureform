import { dialogOverlayAnatomy } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { animated } from "./engine";
import { List } from "./list";
import { ListItem } from "./list-item";
import { nativeSlots, overlayKeys } from "./slot-props";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import {
    byTestId,
    computed,
    interact,
    mount,
    outside,
    settle,
} from "./testing/render";
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

    it("caches provider merges and keeps repeated-part functions lazy", () => {
        const calls: string[] = [];
        const provided = {
            item: {
                style: [{ margin: 2 }, { opacity: 0.3 }],
                onPress: () => calls.push("provider"),
            },
        };
        const each = vi.fn<
            (copy: { index: number }) => { onPress: () => void }
        >(({ index }) => ({
            onPress: () => {
                calls.push(`item-${index}`);
            },
        }));
        const props = {
            slotProps: { item: each },
            style: {
                item: ({ index }: { index: number }) => ({
                    opacity: index / 10,
                }),
            },
        };
        const slots = nativeSlots(props, undefined, provided);
        expect(slots).toBe(nativeSlots(props, undefined, provided));
        expect(slots.each("item")).toBe(true);
        expect(each).not.toHaveBeenCalled();
        const own = { padding: 4 };
        expect(slots.style("item", own, { index: 7 })).toEqual({
            padding: 4,
            margin: 2,
            opacity: 0.7,
        });
        expect(each).not.toHaveBeenCalled();
        slots.on("item", "onPress", () => calls.push("own"), { index: 7 })();
        expect(calls).toEqual(["own", "provider", "item-7"]);
        expect(nativeSlots(undefined, undefined, provided).each("item")).toBe(
            false,
        );
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

    it("resolves only the requested channel and part for the current copy", () => {
        const style = vi.fn<(copy: { index: number }) => { opacity: number }>(
            (copy) => ({ opacity: copy.index / 10 }),
        );
        const props = vi.fn<
            (copy: { index: number }) => { accessibilityLabel: string }
        >((copy) => ({ accessibilityLabel: `copy-${copy.index}` }));
        const other = vi.fn<() => never>(() => {
            throw new Error("unused part");
        });
        const slots = nativeSlots({
            style: { root: style, label: other },
            slotProps: { root: props, label: other },
        });
        expect(slots.each("root")).toBe(true);
        expect(props).not.toHaveBeenCalled();
        expect(style).not.toHaveBeenCalled();
        expect(slots.props("root", { index: 1 })).toEqual({
            accessibilityLabel: "copy-1",
        });
        expect(style).not.toHaveBeenCalled();
        expect(slots.style("root", {}, { index: 2 })).toEqual({ opacity: 0.2 });
        expect(props).toHaveBeenCalledTimes(1);
        expect(slots.props("root", { index: 3 })).toEqual({
            accessibilityLabel: "copy-3",
        });
        expect(other).not.toHaveBeenCalled();
    });

    it("keeps per-instance handlers lazy and preserves cached handler and spread identities", () => {
        const user = vi.fn<() => void>();
        const own = vi.fn<() => void>();
        const input = { onPress: user };
        const props = vi.fn<() => typeof input>(() => input);
        const style = vi.fn<() => never>(() => {
            throw new Error("unused channel");
        });
        const slots = nativeSlots({
            style: { root: style },
            slotProps: { root: props },
        });
        const handler = slots.on("root", "onPress", own);
        expect(slots.on("root", "onPress", own)).toBe(handler);
        const handlers = { onPress: own };
        const merged = slots.with("root", handlers);
        expect(slots.with("root", handlers)).toBe(merged);
        handler();
        expect(own).toHaveBeenCalledTimes(1);
        expect(user).toHaveBeenCalledTimes(1);
        expect(style).not.toHaveBeenCalled();
    });
});

describe("keyed style and slotProps", () => {
    it("merges provider slots under instance customization and preserves button behavior", async () => {
        const calls: string[] = [];
        await render(
            <PureformProvider
                slotProps={{
                    button: {
                        root: {
                            role: "link",
                            style: { marginTop: 3, marginLeft: 4 },
                            onPress: () => calls.push("outer"),
                        },
                        label: { style: { fontStyle: "italic" } },
                    },
                }}
            >
                <PureformProvider
                    slotProps={{
                        button: {
                            root: {
                                style: { marginTop: 5 },
                                onPress: () => calls.push("inner"),
                            },
                        },
                    }}
                >
                    <Button
                        label="Save"
                        testId="save"
                        onPress={() => calls.push("own")}
                        style={{ root: { marginTop: 9 } }}
                        slotProps={{
                            root: {
                                onPress: () => calls.push("instance"),
                                disabled: true,
                            },
                        }}
                    />
                </PureformProvider>
            </PureformProvider>,
        );
        expect(computed("save-root").marginTop).toBe("9px");
        expect(computed("save-root").marginLeft).toBe("4px");
        expect(computed("save-label").fontStyle).toBe("italic");
        expect(byTestId("save-root").getAttribute("role")).toBe("button");
        await interact(() => userEvent.click(byTestId("save-root")));
        expect(calls).toEqual(["own", "outer", "inner", "instance"]);
    });

    it("addresses an overlay's parts by name as an instance does: the surface is `content`", async () => {
        await render(
            <PureformProvider
                slotProps={{
                    dialog: {
                        content: { style: { marginTop: 7 } },
                        backdrop: { style: { opacity: 0.5 } },
                    },
                    scrim: { root: { style: { marginLeft: 2 } } },
                }}
            >
                <Dialog
                    defaultOpen
                    headline="Discard draft?"
                    style={{ content: { marginLeft: 9 } }}
                    testId={{ backdrop: "dim" }}
                >
                    Gone.
                </Dialog>
            </PureformProvider>,
        );
        await settle(600);
        expect(computed("pf-dialog-content").marginTop).toBe("7px");
        expect(computed("pf-dialog-content").marginLeft).toBe("9px");
        expect(byTestId("pf-dialog-content").getAttribute("aria-label")).toBe(
            "Discard draft?",
        );
        expect(computed("dim").marginTop).toBe("0px");
        // Every scrim's props, then this dialog's own `backdrop`.
        expect(computed("dim").marginLeft).toBe("2px");
        expect(computed("dim").opacity).toBe("0.5");
    });

    it("lets an instance's backdrop win over the provider's, and another owner's key not reach it", async () => {
        await render(
            <PureformProvider
                slotProps={{
                    dialog: { backdrop: { style: { opacity: 0.5 } } },
                    bottomSheet: { backdrop: { style: { opacity: 0.1 } } },
                }}
            >
                <Dialog
                    defaultOpen
                    headline="Discard draft?"
                    style={{ backdrop: { opacity: 0.8 } }}
                    testId={{ backdrop: "dim" }}
                >
                    Gone.
                </Dialog>
            </PureformProvider>,
        );
        await settle(600);
        expect(computed("dim").opacity).toBe("0.8");
    });

    it("says in development when a provider still keys an overlay by its preset slot, not for Native's own tabs", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            await render(
                <PureformProvider
                    slotProps={
                        {
                            popover: { root: { style: { margin: 1 } } },
                            tabs: { root: { style: { margin: 1 } } },
                            dialog: { content: { style: { margin: 1 } } },
                        } as never
                    }
                >
                    <View />
                </PureformProvider>,
            );
            const said = warn.mock.calls.map((call) => String(call[0]));
            expect(said).toHaveLength(1);
            expect(said[0]).toContain("slotProps.popover.root");
            expect(said[0]).toContain("slotProps.popover.content");
            expect(said[0]).toContain("isn't a part on this platform");
        } finally {
            warn.mockRestore();
        }
    });

    it("reacts to provider replacement and removal without resetting instance state", async () => {
        const value = outside(3);
        const calls: string[] = [];
        await render(
            <value.Holder>
                {(margin) => (
                    <PureformProvider
                        slotProps={{
                            button: {
                                root: {
                                    style: { marginLeft: 4 },
                                    onPress: () => calls.push("outer"),
                                },
                            },
                        }}
                    >
                        <PureformProvider
                            slotProps={
                                margin === 0
                                    ? undefined
                                    : {
                                          button: {
                                              root: {
                                                  style: { marginLeft: margin },
                                                  onPress: () =>
                                                      calls.push(
                                                          `inner-${margin}`,
                                                      ),
                                              },
                                          },
                                      }
                            }
                        >
                            <Button
                                label="Toggle"
                                defaultSelected={false}
                                testId="toggle"
                            />
                        </PureformProvider>
                    </PureformProvider>
                )}
            </value.Holder>,
        );
        const root = byTestId("toggle-root");
        expect(computed("toggle-root").marginLeft).toBe("3px");
        await interact(() => userEvent.click(root));
        expect(root.getAttribute("aria-pressed")).toBe("true");
        expect(calls).toEqual(["outer", "inner-3"]);
        await value.set(8);
        expect(byTestId("toggle-root")).toBe(root);
        expect(computed("toggle-root").marginLeft).toBe("8px");
        calls.length = 0;
        await interact(() => userEvent.click(root));
        expect(calls).toEqual(["outer", "inner-8"]);
        await value.set(0);
        expect(computed("toggle-root").marginLeft).toBe("4px");
        expect(root.getAttribute("aria-pressed")).toBe("false");
        calls.length = 0;
        await interact(() => userEvent.click(root));
        expect(calls).toEqual(["outer"]);
    });

    it("customizes TextInput and repeated item hosts without replacing their internal wiring", async () => {
        const values: string[] = [];
        const changes = vi.fn<(value: string) => void>();
        await render(
            <PureformProvider
                slotProps={{
                    textField: {
                        input: {
                            placeholder: "Ada",
                            maxLength: 4,
                            onChangeText: changes,
                        },
                    },
                    listItem: { headline: { style: { fontStyle: "italic" } } },
                }}
            >
                <TextField
                    label="Name"
                    slotProps={{ input: { placeholder: "Name" } }}
                    testId="name"
                    onValueChange={({ value }) => values.push(value)}
                />
                <List
                    items={[
                        { headline: "Inbox", testId: "inbox" },
                        { headline: "Sent", testId: "sent" },
                    ]}
                />
                <ListItem
                    headline="Draft"
                    testId="draft"
                    style={{ headline: { fontStyle: "normal" } }}
                />
            </PureformProvider>,
        );
        const input = byTestId("name-input") as HTMLInputElement;
        expect(input.placeholder).toBe("");
        expect(input.maxLength).toBe(4);
        expect(input.getAttribute("aria-labelledby")).toBe(
            byTestId("name-label").id,
        );
        await interact(() => userEvent.click(input));
        expect(input.placeholder).toBe("Name");
        await interact(() => userEvent.fill(input, "Jane"));
        expect(values.at(-1)).toBe("Jane");
        expect(changes).toHaveBeenLastCalledWith("Jane");
        expect(computed("inbox-headline").fontStyle).toBe("italic");
        expect(computed("sent-headline").fontStyle).toBe("italic");
        expect(computed("draft-headline").fontStyle).toBe("normal");
    });

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
