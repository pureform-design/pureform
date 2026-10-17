import {
    createInteractionSource,
    type Interaction,
    type MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import * as button from "../button";
import * as checkbox from "../checkbox";
import * as menu from "../menu";
import * as navigation from "../navigation";
import * as radioGroup from "../radio-group";
import * as select from "../select";
import * as slider from "../slider";
import * as switchControl from "../switch";
import * as tabs from "../tabs";
import { run, settle } from "../testing/vanilla";

const stops: (() => void)[] = [];
afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    document.body.innerHTML = "";
});

/** A source and the interactions it hears, by type, with a press's pointer and origin. */
function recorded() {
    const source = createInteractionSource();
    const seen: Interaction[] = [];
    const origins: unknown[] = [];
    source.subscribe((interaction, _, origin) => {
        seen.push(interaction);
        origins.push(origin);
    });
    const types = () =>
        seen.map((interaction) =>
            interaction.type === "press"
                ? `press:${interaction.pointer}`
                : interaction.type === "focus"
                  ? `focus:${interaction.visible ? "visible" : "hidden"}`
                  : interaction.type,
        );
    return { source, seen, origins, types };
}

/** Item sources by value, as a binding passes `itemInteractionSource`. */
function recordedItems() {
    const items = new Map<string, ReturnType<typeof recorded>>();
    const of = (value: string) => {
        let item = items.get(value);
        if (!item) {
            item = recorded();
            items.set(value, item);
        }
        return item;
    };
    return {
        of,
        itemInteractionSource: (value: string): MutableInteractionSource =>
            of(value).source,
    };
}

const pointer = (type: string, init: PointerEventInit = {}) =>
    new PointerEvent(type, {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
        clientX: 10,
        clientY: 20,
        ...init,
    });

const key = (type: "keydown" | "keyup", value: string) =>
    new KeyboardEvent(type, { key: value, bubbles: true });

function mountButton(
    props: Partial<button.Props>,
    host: Element = document.body,
) {
    const root = document.createElement("button");
    root.textContent = "Save";
    host.append(root);
    const running = run(button.machine, button.connect, props, (api, spread) =>
        spread(root, api.getRootProps()),
    );
    stops.push(running.stop);
    return { ...running, root };
}

describe("button", () => {
    it("emits a mouse press from where it went down, and its release", async () => {
        const { source, seen, origins, types } = recorded();
        const { root } = mountButton({ id: "a", interactionSource: source });
        root.dispatchEvent(pointer("pointermove"));
        root.dispatchEvent(pointer("pointerdown"));
        await settle();
        expect(source.state).toMatchObject({ pressed: true, hovered: true });
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        root.dispatchEvent(pointer("pointerleave"));
        expect(types()).toEqual([
            "hoverEnter",
            "press:mouse",
            "release",
            "hoverExit",
        ]);
        expect(seen[1]).toMatchObject({ origin: { x: 10, y: 20 } });
        expect(seen[2]).toEqual({
            type: "release",
            id: seen[1]!["id" as never],
        });
        expect(origins.every((origin) => origin === root)).toBe(true);
    });

    it("never hovers for touch", async () => {
        const { source, types } = recorded();
        const { root, api } = mountButton({
            id: "a",
            interactionSource: source,
        });
        root.dispatchEvent(pointer("pointermove", { pointerType: "touch" }));
        root.dispatchEvent(pointer("pointerdown", { pointerType: "touch" }));
        await settle();
        expect(api().hovered).toBe(false);
        window.dispatchEvent(
            pointer("pointercancel", { pointerType: "touch" }),
        );
        await settle();
        expect(types()).toEqual(["press:touch", "cancel"]);
    });

    it("emits a keyboard press from the center, after visible focus", async () => {
        const { source, seen, types } = recorded();
        const { root, api } = mountButton({
            id: "a",
            interactionSource: source,
        });
        await userEvent.tab();
        await userEvent.keyboard("{Enter>}");
        await settle();
        expect(api().pressed).toBe(true);
        expect(seen.at(-1)).toMatchObject({ origin: "center" });
        await userEvent.keyboard("{/Enter}");
        await userEvent.keyboard("{Enter>}");
        root.blur();
        await settle();
        expect(types()).toEqual([
            "focus:visible",
            "press:keyboard",
            "release",
            "press:keyboard",
            "cancel",
            "blur",
        ]);
        expect(api().pressed).toBe(false);
    });

    it("ends a press, the hover, and focus when it becomes disabled mid-press", async () => {
        const { source, types } = recorded();
        const { root, api, setProps } = mountButton({
            id: "a",
            interactionSource: source,
        });
        root.focus();
        root.dispatchEvent(pointer("pointermove"));
        root.dispatchEvent(pointer("pointerdown"));
        await settle();
        setProps({ id: "a", interactionSource: source, disabled: true });
        await settle();
        expect(types().slice(-3)).toEqual(["cancel", "hoverExit", "blur"]);
        expect(source.state).toMatchObject({
            pressed: false,
            hovered: false,
            focused: false,
        });
        expect(api().pressed).toBe(false);
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(types().filter((type) => type === "release")).toEqual([]);
    });

    it("lets the innermost of nested pressables claim the press", async () => {
        const outer = recorded();
        const inner = recorded();
        const outerButton = mountButton({
            id: "outer",
            interactionSource: outer.source,
        });
        const innerButton = mountButton(
            { id: "inner", interactionSource: inner.source },
            outerButton.root,
        );
        innerButton.root.dispatchEvent(pointer("pointerdown"));
        innerButton.root.dispatchEvent(key("keydown", "Enter"));
        await settle();
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(inner.types()).toEqual(["press:mouse", "release"]);
        expect(outer.types()).toEqual([]);
        expect(outerButton.api().pressed).toBe(false);

        outerButton.root.dispatchEvent(pointer("pointerdown"));
        await settle();
        expect(outer.types()).toEqual(["press:mouse"]);
        window.dispatchEvent(pointer("pointerup"));
    });

    it("reads pressed, hovered, and focus-visible from a source another emits to", async () => {
        const source = createInteractionSource();
        const { api } = mountButton({ id: "a", interactionSource: source });
        await settle();
        source.emit({
            type: "press",
            id: -1,
            origin: "center",
            pointer: "virtual",
        });
        source.emit({ type: "hoverEnter" });
        source.emit({ type: "focus", visible: true });
        await settle();
        expect(api()).toMatchObject({
            pressed: true,
            hovered: true,
            focusVisible: true,
            focused: false,
        });
        source.emit({ type: "cancel", id: -1 });
        await settle();
        expect(api().pressed).toBe(false);
    });

    it("keeps a source of its own without one", async () => {
        const { root, api } = mountButton({ id: "a" });
        root.dispatchEvent(pointer("pointerdown"));
        await settle();
        expect(api().pressed).toBe(true);
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(api().pressed).toBe(false);
    });

    it("ends what's in progress when it stops", async () => {
        const { source, types } = recorded();
        const { root, stop } = mountButton({
            id: "a",
            interactionSource: source,
        });
        root.dispatchEvent(pointer("pointerdown"));
        await settle();
        stop();
        expect(types()).toEqual(["press:mouse", "cancel"]);
        expect(source.state.pressed).toBe(false);
    });
});

describe.each([
    ["checkbox", checkbox],
    ["switch", switchControl],
] as const)("%s", (name, machine) => {
    function mount(props: object) {
        const root = document.createElement("label");
        const input = document.createElement("input");
        root.append(input);
        document.body.append(root);
        const running = run(
            machine.machine as typeof checkbox.machine,
            machine.connect as typeof checkbox.connect,
            { id: name, ...props },
            (api, spread) => {
                spread(root, api.getRootProps());
                const { style: _style, ...inputProps } =
                    api.getHiddenInputProps() as { style?: unknown };
                spread(input, inputProps);
            },
        );
        stops.push(running.stop);
        return { ...running, root, input };
    }

    it("emits the root's pointer and the input's focus and Space", async () => {
        const { source, types } = recorded();
        const { root, input } = mount({ interactionSource: source });
        root.dispatchEvent(pointer("pointermove"));
        root.dispatchEvent(pointer("pointerdown", { pointerType: "pen" }));
        window.dispatchEvent(pointer("pointerup"));
        root.dispatchEvent(pointer("pointerleave"));
        await userEvent.tab();
        expect(document.activeElement).toBe(input);
        // Dispatched rather than typed: the harness spreads new listeners on every render, and
        // Zag's own Space listener renders during the key's dispatch.
        input.dispatchEvent(key("keydown", " "));
        input.dispatchEvent(key("keyup", " "));
        await settle();
        expect(types()).toEqual([
            "hoverEnter",
            "press:pen",
            "release",
            "hoverExit",
            "focus:visible",
            "press:keyboard",
            "release",
        ]);
    });

    it("ends a press and focus when it becomes disabled mid-press", async () => {
        const { source, types } = recorded();
        const { root, input, setProps } = mount({ interactionSource: source });
        input.focus();
        root.dispatchEvent(pointer("pointerdown"));
        await settle();
        setProps({ id: name, interactionSource: source, disabled: true });
        await settle();
        expect(types().slice(-2)).toEqual(["cancel", "blur"]);
        expect(source.state).toMatchObject({ pressed: false, focused: false });
    });
});

describe("radio group", () => {
    it("emits each radio's interactions to its own source", async () => {
        const items = recordedItems();
        const root = document.createElement("div");
        document.body.append(root);
        const radios = ["a", "b"].map((value) => {
            const item = document.createElement("label");
            const input = document.createElement("input");
            item.append(input);
            root.append(item);
            return { value, item, input };
        });
        const running = run(
            radioGroup.machine,
            radioGroup.connect,
            {
                id: "size",
                defaultValue: "a",
                itemInteractionSource: items.itemInteractionSource,
            },
            (api, spread) => {
                spread(root, api.getRootProps());
                for (const { value, item, input } of radios) {
                    spread(item, api.getItemProps({ value }));
                    const { style: _style, ...inputProps } =
                        api.getItemHiddenInputProps({ value }) as {
                            style?: unknown;
                        };
                    spread(input, inputProps);
                }
            },
        );
        stops.push(running.stop);
        radios[1]!.item.dispatchEvent(pointer("pointerdown"));
        window.dispatchEvent(pointer("pointerup"));
        await userEvent.tab();
        expect(document.activeElement).toBe(radios[0]!.input);
        radios[0]!.input.dispatchEvent(key("keydown", " "));
        radios[0]!.input.dispatchEvent(key("keyup", " "));
        await settle();
        expect(items.of("b").types()).toEqual(["press:mouse", "release"]);
        expect(items.of("a").types()).toEqual([
            "focus:visible",
            "press:keyboard",
            "release",
        ]);

        running.setProps({
            id: "size",
            defaultValue: "a",
            itemInteractionSource: items.itemInteractionSource,
            disabled: true,
        });
        await settle();
        expect(items.of("a").types().at(-1)).toBe("blur");
    });
});

describe("slider", () => {
    function mount(props: Partial<slider.Props>) {
        const root = document.createElement("div");
        const input = document.createElement("input");
        root.append(input);
        document.body.append(root);
        const running = run(
            slider.machine,
            slider.connect,
            { id: "volume", ...props },
            (api, spread) => {
                spread(root, api.getRootProps());
                spread(input, api.getInputProps());
            },
        );
        stops.push(running.stop);
        return { ...running, input };
    }

    it("emits a drag and its press while the pointer is down", async () => {
        const { source, types } = recorded();
        const { input, api } = mount({ interactionSource: source });
        input.dispatchEvent(pointer("pointermove"));
        input.dispatchEvent(pointer("pointerdown"));
        await settle();
        expect(api().dragging).toBe(true);
        expect(source.state).toMatchObject({ pressed: true, dragged: true });
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(types()).toEqual([
            "hoverEnter",
            "press:mouse",
            "dragStart",
            "dragStop",
            "release",
        ]);
    });

    it("ends a drag when it becomes disabled mid-drag", async () => {
        const { source, types } = recorded();
        const { input, setProps } = mount({ interactionSource: source });
        input.dispatchEvent(pointer("pointerdown", { pointerType: "touch" }));
        await settle();
        setProps({ id: "volume", interactionSource: source, disabled: true });
        await settle();
        expect(types()).toEqual([
            "press:touch",
            "dragStart",
            "cancel",
            "dragStop",
        ]);
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(types()).toHaveLength(4);
    });
});

describe("tabs", () => {
    it("emits each tab's interactions to its own source", async () => {
        const items = recordedItems();
        const root = document.createElement("div");
        const list = document.createElement("div");
        root.append(list);
        document.body.append(root);
        const triggers = ["flights", "hotels"].map((value) => {
            const trigger = document.createElement("button");
            trigger.textContent = value;
            list.append(trigger);
            return { value, trigger };
        });
        const running = run(
            tabs.machine,
            tabs.connect,
            {
                id: "trip",
                defaultValue: "flights",
                itemInteractionSource: items.itemInteractionSource,
            },
            (api, spread) => {
                spread(root, api.getRootProps());
                spread(list, api.getListProps());
                for (const { value, trigger } of triggers) {
                    spread(trigger, api.getTriggerProps({ value }));
                }
            },
        );
        stops.push(running.stop);
        triggers[1]!.trigger.dispatchEvent(pointer("pointermove"));
        triggers[1]!.trigger.dispatchEvent(pointer("pointerdown"));
        window.dispatchEvent(pointer("pointerup"));
        triggers[1]!.trigger.dispatchEvent(pointer("pointerleave"));
        await userEvent.tab();
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(items.of("hotels").types()).toEqual([
            "hoverEnter",
            "press:mouse",
            "release",
            "hoverExit",
        ]);
        expect(items.of("flights").types()).toEqual([
            "focus:visible",
            "press:keyboard",
            "release",
        ]);
    });
});

describe("navigation", () => {
    it("presses a link with Enter only, and a button with Enter or Space", async () => {
        const items = recordedItems();
        const root = document.createElement("nav");
        const link = document.createElement("a");
        link.href = "#home";
        link.textContent = "Home";
        const action = document.createElement("button");
        action.textContent = "Search";
        root.append(link, action);
        document.body.append(root);
        const running = run(
            navigation.machine,
            navigation.connect,
            { id: "nav", itemInteractionSource: items.itemInteractionSource },
            (api, spread) => {
                spread(root, api.getRootProps());
                spread(link, api.getItemProps({ value: "home" }));
                spread(action, api.getItemProps({ value: "search" }));
            },
        );
        stops.push(running.stop);
        for (const element of [link, action]) {
            element.dispatchEvent(key("keydown", " "));
            element.dispatchEvent(key("keyup", " "));
            element.dispatchEvent(key("keydown", "Enter"));
            element.dispatchEvent(key("keyup", "Enter"));
        }
        await settle();
        expect(items.of("home").types()).toEqual(["press:keyboard", "release"]);
        expect(items.of("search").types()).toEqual([
            "press:keyboard",
            "release",
            "press:keyboard",
            "release",
        ]);

        action.dispatchEvent(pointer("pointermove"));
        running.setProps({
            id: "nav",
            itemInteractionSource: items.itemInteractionSource,
            disabled: true,
        });
        await settle();
        expect(items.of("search").types().slice(-2)).toEqual([
            "hoverEnter",
            "hoverExit",
        ]);
    });
});

describe.each([
    ["menu", "setHighlightedValue"],
    ["select", "setHighlightValue"],
] as const)("%s", (name, highlight) => {
    function mount(
        itemInteractionSource: (value: string) => MutableInteractionSource,
    ) {
        const trigger = document.createElement("button");
        const positioner = document.createElement("div");
        const content = document.createElement("div");
        positioner.append(content);
        document.body.append(trigger, positioner);
        const items = ["copy", "paste"].map((value) => {
            const item = document.createElement("div");
            item.textContent = value;
            content.append(item);
            return { value, item };
        });
        const collection = select.collection({
            items: items.map(({ value }) => ({ value, label: value })),
        });
        const running =
            name === "menu"
                ? run(
                      menu.machine,
                      menu.connect,
                      { id: name, defaultOpen: true, itemInteractionSource },
                      (api, spread) => {
                          spread(trigger, api.getTriggerProps());
                          spread(positioner, api.getPositionerProps());
                          spread(content, api.getContentProps());
                          for (const { value, item } of items) {
                              spread(item, api.getItemProps({ value }));
                          }
                      },
                  )
                : run(
                      select.machine,
                      select.connect,
                      {
                          id: name,
                          collection,
                          defaultOpen: true,
                          itemInteractionSource,
                      },
                      (api, spread) => {
                          spread(trigger, api.getTriggerProps());
                          spread(positioner, api.getPositionerProps());
                          spread(content, api.getContentProps());
                          for (const { value, item } of items) {
                              spread(
                                  item,
                                  api.getItemProps({
                                      item: { value, label: value },
                                  }),
                              );
                          }
                      },
                  );
        stops.push(running.stop);
        const api = running.api as unknown as () => Record<string, unknown> & {
            setOpen(open: boolean): void;
        };
        return { api, content, items };
    }

    it("hovers the highlighted item, and presses it with the keyboard", async () => {
        const items = recordedItems();
        const { api, content } = mount(items.itemInteractionSource);
        await settle();
        (api()[highlight] as (value: string) => void)("copy");
        await settle();
        (api()[highlight] as (value: string) => void)("paste");
        await settle();
        expect(items.of("copy").types()).toEqual(["hoverEnter", "hoverExit"]);
        expect(items.of("copy").origins).toEqual([undefined, undefined]);

        const paste = items.of("paste");
        content.dispatchEvent(key("keydown", "Enter"));
        await settle();
        // Enter chooses the item, which closes the list.
        expect(paste.types()).toEqual([
            "hoverEnter",
            "press:keyboard",
            "release",
            "hoverExit",
        ]);
        expect(paste.origins.slice(1, 3)).toEqual([undefined, undefined]);
    });

    it("ends what an item has in progress when it closes", async () => {
        const items = recordedItems();
        const { api, items: elements } = mount(items.itemInteractionSource);
        await settle();
        (api()[highlight] as (value: string) => void)("copy");
        await settle();
        elements[0]!.item.dispatchEvent(pointer("pointerdown"));
        await settle();
        api().setOpen(false);
        await settle();
        const copy = items.of("copy");
        expect(copy.types()).toEqual([
            "hoverEnter",
            "press:mouse",
            "hoverExit",
            "cancel",
        ]);
        expect(copy.source.state).toMatchObject({
            pressed: false,
            hovered: false,
        });
        window.dispatchEvent(pointer("pointerup"));
    });

    it("presses an item with the pointer", async () => {
        const items = recordedItems();
        const { items: elements } = mount(items.itemInteractionSource);
        elements[0]!.item.dispatchEvent(pointer("pointerdown"));
        window.dispatchEvent(pointer("pointerup"));
        await settle();
        expect(items.of("copy").types()).toContain("press:mouse");
        expect(items.of("copy").types()).toContain("release");
    });
});
