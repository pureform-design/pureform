// Icon slots in Chromium, for each web target (the Panda preset, the CSS adapter, and Tailwind
// through it): an icon font is drawn filled where Material fills it (the current navigation
// destination, a selected toggle icon button), an icon marked `data-pf-mirror` flips under rtl,
// and a toggle icon button takes Material's selected colors.

import * as pandaRecipes from "$recipes";
import { STATE_ATTRIBUTES } from "@pureform/core";
import { classesFor } from "@pureform/css-adapter";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import type { Adapter } from "./commands";

import pandaCss from "#/styles.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };
const MIRROR = STATE_ATTRIBUTES.mirrored;

type Classes = (
    name: string,
    selection?: Record<string, string>,
) => Record<string, string>;

type ClassFns = Record<string, (selection: object) => unknown>;

const classesOf =
    (fns: ClassFns, typed: boolean): Classes =>
    (name, selection = {}) => {
        const fn = fns[name];
        if (!fn) throw new Error(`no classes for ${name}`);
        // Panda types a "true"/"false" group as a boolean and compares strictly.
        const values = typed
            ? Object.fromEntries(
                  Object.entries(selection).map(([group, value]) => [
                      group,
                      value === "true"
                          ? true
                          : value === "false"
                            ? false
                            : value,
                  ]),
              )
            : selection;
        return fn(values) as Record<string, string>;
    };

const adapterClasses = classesOf(classesFor(pureformConfig) as ClassFns, false);

const STYLINGS: Record<
    "Panda" | Adapter,
    { classes: Classes; css: () => Promise<string> }
> = {
    Panda: {
        classes: classesOf(pandaRecipes as unknown as ClassFns, true),
        css: async () => pandaCss,
    },
    CSS: {
        classes: adapterClasses,
        css: () => commands.adapterCss("CSS", OPTIONS),
    },
    Tailwind: {
        classes: adapterClasses,
        css: () => commands.adapterCss("Tailwind", OPTIONS),
    },
};

const FILLS = ["standard", "filled", "tonal", "outlined", "elevated"];

describe.each(Object.keys(STYLINGS) as (keyof typeof STYLINGS)[])(
    "%s: icon slots",
    (styling) => {
        let frame: HTMLIFrameElement;
        const classes: Classes = (name, selection) =>
            STYLINGS[styling].classes(name, selection);

        beforeAll(async () => {
            frame = document.createElement("iframe");
            frame.style.cssText = "width: 800px; height: 600px; border: 0";
            document.body.append(frame);
            const doc = frame.contentDocument!;
            doc.open();
            doc.write(
                `<!doctype html><html><head><style>${await STYLINGS[styling].css()}</style></head><body></body></html>`,
            );
            doc.close();
        });

        afterAll(() => frame.remove());

        // Renders the markup, returns each `[data-part]` element's computed style, and removes it.
        const render = (
            markup: string,
            dir: "ltr" | "rtl" = "ltr",
        ): Record<string, CSSStyleDeclaration> => {
            const doc = frame.contentDocument!;
            const host = doc.createElement("div");
            host.dir = dir;
            host.innerHTML = markup;
            doc.body.append(host);
            // Finish any color fade the new elements start.
            for (const animation of host.getAnimations({ subtree: true })) {
                animation.finish();
            }
            const styles = Object.fromEntries(
                [...host.querySelectorAll<HTMLElement>("[data-part]")].map(
                    (element) => {
                        const style =
                            frame.contentWindow!.getComputedStyle(element);
                        // A snapshot, since the element goes away.
                        const copy = {} as Record<string, string>;
                        for (const property of style) {
                            copy[property] = style.getPropertyValue(property);
                        }
                        return [element.dataset.part!, copy];
                    },
                ),
            );
            host.remove();
            return styles as unknown as Record<string, CSSStyleDeclaration>;
        };

        const value = (style: CSSStyleDeclaration, property: string) =>
            (style as unknown as Record<string, string>)[property];

        const iconButton = (
            selection: Record<string, string>,
            attributes = "",
            iconAttributes = "",
            prefix = "",
        ) => {
            const c = classes("iconButton", selection);
            return `<button class="${c.root}" type="button" aria-label="Favorite" data-part="${prefix}root"${attributes}>
                <span class="${c.touchTarget}"></span>
                <span class="${c.container}" data-part="${prefix}container"><span class="${c.icon}" data-part="${prefix}icon"${iconAttributes}>★</span></span>
                <span class="${c.outline}" data-part="${prefix}outline"></span>
            </button>`;
        };

        const navigation = (name: string) => {
            const c = classes(name);
            const item = (current: boolean, part: string) =>
                `<a class="${c.item}" href="#"${current ? ` aria-current="page"` : ""}>
                    <span class="${c.indicator}">
                        <span class="${c.activeIndicator}"></span>
                        <span class="${c.icon}" data-part="${part}">⌂</span>
                    </span>
                    <span class="${c.label}">${part}</span>
                </a>`;
            return `<nav class="${c.root}">${item(true, "current")}${item(false, "other")}</nav>`;
        };

        it.each(["navigationBar", "navigationRail"])(
            "%s draws the current destination's icon filled",
            (name) => {
                const styles = render(navigation(name));
                expect(value(styles.current!, "font-variation-settings")).toBe(
                    '"FILL" 1',
                );
                expect(value(styles.other!, "font-variation-settings")).toBe(
                    '"FILL" 0',
                );
            },
        );

        it("lets a standalone icon follow its slot's fill, unless filled says otherwise", () => {
            const nav = classes("navigationBar");
            // The icon has no slots, so its classes are a string.
            const icon = (filled: string) =>
                classes("icon", { filled }) as unknown as string;
            const styles = render(
                `<a class="${nav.item}" href="#" aria-current="page"><span class="${nav.icon}">
                    <span class="${icon("inherit")}" data-part="inherit"></span>
                    <span class="${icon("false")}" data-part="outlined"></span>
                </span></a>`,
            );
            expect(value(styles.inherit!, "font-variation-settings")).toBe(
                '"FILL" 1',
            );
            expect(value(styles.outlined!, "font-variation-settings")).toBe(
                '"FILL" 0',
            );
        });

        it("draws a selected toggle icon button's icon filled", () => {
            const on = render(
                iconButton({ toggle: "true" }, ` aria-pressed="true"`),
            );
            const off = render(
                iconButton({ toggle: "true" }, ` aria-pressed="false"`),
            );
            expect(value(on.icon!, "font-variation-settings")).toBe('"FILL" 1');
            expect(value(off.icon!, "font-variation-settings")).toBe(
                '"FILL" 0',
            );
        });

        it("flips an icon marked data-pf-mirror under rtl only", () => {
            const transform = (dir: "ltr" | "rtl", marked: boolean) =>
                value(
                    render(iconButton({}, "", marked ? ` ${MIRROR}` : ""), dir)
                        .icon!,
                    "transform",
                );
            expect(transform("rtl", true)).toBe("matrix(-1, 0, 0, 1, 0, 0)");
            expect(transform("rtl", false)).toBe("none");
            expect(transform("ltr", true)).toBe("none");
        });

        it("keeps a text field icon centered when it flips", () => {
            const c = classes("textField", { leadingIcon: "true" });
            const styles = render(
                `<label class="${c.root}"><span class="${c.container}">
                    <span class="${c.leadingIcon}" data-part="icon" ${MIRROR}>⌕</span>
                    <input class="${c.input}" placeholder=" ">
                </span></label>`,
                "rtl",
            );
            expect(value(styles.icon!, "transform")).toMatch(
                /^matrix\(-1, 0, 0, 1, 0, -\d+(\.\d+)?\)$/,
            );
        });

        // Material's toggle icon buttons: a selected filled or tonal toggle looks like the
        // plain button, as does a selected standard toggle's icon; unselected, each differs.
        // A selected outlined toggle fills and drops its outline.
        it.each(FILLS)("draws a %s toggle's selected colors", (variant) => {
            const styles = render(
                [
                    iconButton({ variant }, "", "", "plain-"),
                    iconButton(
                        { variant, toggle: "true" },
                        ` aria-pressed="true"`,
                        "",
                        "on-",
                    ),
                    iconButton(
                        { variant, toggle: "true" },
                        ` aria-pressed="false"`,
                        "",
                        "off-",
                    ),
                ].join(""),
            );
            const colors = (prefix: string) => ({
                container: value(
                    styles[`${prefix}container`]!,
                    "background-color",
                ),
                content: value(styles[`${prefix}root`]!, "color"),
            });
            const [plain, on, off] = ["plain-", "on-", "off-"].map(colors);
            expect(on).not.toEqual(off);
            if (variant === "filled" || variant === "tonal") {
                expect(on).toEqual(plain);
                expect(off!.container).not.toBe(plain!.container);
            }
            if (variant === "standard") {
                expect(on!.content).toBe(plain!.content);
                expect(on!.container).toBe("rgba(0, 0, 0, 0)");
            }
            if (variant === "outlined") {
                expect(on!.container).not.toBe("rgba(0, 0, 0, 0)");
                expect(value(styles["on-outline"]!, "display")).toBe("none");
                expect(value(styles["off-outline"]!, "display")).not.toBe(
                    "none",
                );
            }
        });
    },
);
