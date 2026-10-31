// The web half of pureform's bindings, for React and Solid: the system's reduced-motion
// preference, an icon slot's measured style, a native checkbox kept in step with its machine, an
// overlay's positioner stacked at its surface's layer, an active indicator sliding between tabs,
// drags and swipes, runtime themes and overrides as CSS, and the web-only props of the components'
// contracts. Only call the DOM readers in the browser, after mount. `@pureform/binding-core` stays
// free of DOM types and APIs, for React Native.

import {
    SLIDER_INSET_ICON,
    sliderClearanceOf,
    sliderTrackTokens,
} from "@pureform/binding-core";
import type { SliderInsetIconMeasures } from "@pureform/binding-core";
import { sameIconStyle } from "@pureform/binding-core";
import type { IconStyle as PortableIconStyle } from "@pureform/binding-core";
import { REDUCED_MOTION_QUERY } from "@pureform/web-contracts";

export { resolveWebSlotCustomization } from "./slot-props";
export * from "./components";
export { overDefaults } from "./defaults";
export { partAttributes } from "./anatomy";
export { cx } from "./class-names";
export { styleRippleElement } from "./ripple-element";
export type { ClassDictionary, ClassValue } from "./class-names";
export {
    classEntry,
    lazyFactoryError,
    serverLazyFactoryMessage,
} from "./entries";
export { combineProps, mergeStyleObjects } from "./props";
export type { CombineRules } from "./props";
export {
    outsideRootMessage,
    partClasses,
    partSources,
    spreadableProps,
    stateAttributes,
} from "./parts";
export type { PartSourcesInput, StateAttributes } from "./parts";
export {
    providerAttributes,
    resolveWebProvider,
    ROOT_WEB_PROVIDER,
    themeAttributeOf,
    themeAttributes,
} from "./provider";
export type {
    ProviderAttributes,
    ProviderTheme,
    ThemeHydration,
    ThemeName,
    ThemeOverrides,
    WebProviderOptions,
    WebProviderState,
} from "./provider";
export type {
    WebSlotCustomization,
    ResolvedWebSlotCustomization,
} from "./slot-props";

/** Whether the system asks for reduced motion now; `false` where there's no `matchMedia`. */
export const systemReducedMotion = (): boolean =>
    typeof matchMedia === "function" &&
    matchMedia(REDUCED_MOTION_QUERY).matches;

/** Calls `onChange` with the system's preference now and on every change. Returns the cleanup. */
export const subscribeReducedMotion = (
    onChange: (reduce: boolean) => void,
): VoidFunction => {
    if (typeof matchMedia !== "function") {
        onChange(false);
        return () => {};
    }
    const query = matchMedia(REDUCED_MOTION_QUERY);
    const listener = (event: MediaQueryListEvent) => onChange(event.matches);
    onChange(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
};

/** Web presentation has a CSS inheritance fallback, even before measurement. */
export interface IconStyle extends PortableIconStyle {
    readonly color: string;
}

export const DEFAULT_ICON_STYLE: IconStyle = Object.freeze({
    size: undefined,
    color: "currentColor",
    filled: false,
});

const FILL = /"FILL"\s+(-?[\d.]+)/;

/** An icon slot's style as computed now: its `font-size` (the slot's icon size), `color`, and
 *  Material Symbols' `FILL` axis from `font-variation-settings`. */
export const readIconStyle = (element: Element): IconStyle => {
    const computed = getComputedStyle(element);
    const size = Number.parseFloat(computed.fontSize);
    const fill = FILL.exec(computed.fontVariationSettings)?.[1];
    return {
        size: Number.isFinite(size) ? size : undefined,
        color: computed.color || DEFAULT_ICON_STYLE.color,
        filled: fill !== undefined && Number.parseFloat(fill) >= 0.5,
    };
};

// The component root an icon part belongs to, whose attributes carry the states that restyle it.
const componentRoot = (element: Element): Element => {
    const scope = element.getAttribute("data-scope");
    const root = scope
        ? element.closest(`[data-scope="${scope}"][data-pf-part="root"]`)
        : null;
    return root ?? element.parentElement ?? element;
};

/** Calls `onChange` with the icon slot's style now, and again whenever it changes: after an
 *  attribute changes in its component (`aria-pressed`, `aria-current`, `data-pf-*`), after a
 *  transition in the component ends, and when the slot resizes. Returns the cleanup.
 *
 *  A style that changes by a pseudo-class alone (`:hover`) with no transition isn't seen. */
export const observeIconStyle = (
    element: Element,
    onChange: (style: IconStyle) => void,
): VoidFunction => {
    let current = readIconStyle(element);
    onChange(current);
    const update = () => {
        const next = readIconStyle(element);
        if (sameIconStyle(next, current)) return;
        current = next;
        onChange(next);
    };
    const root = componentRoot(element);
    const mutations = new MutationObserver(update);
    mutations.observe(root, { attributes: true, subtree: true });
    const resize =
        typeof ResizeObserver === "function"
            ? new ResizeObserver(update)
            : undefined;
    resize?.observe(element);
    root.addEventListener("transitionend", update);
    root.addEventListener("transitioncancel", update);
    return () => {
        mutations.disconnect();
        resize?.disconnect();
        root.removeEventListener("transitionend", update);
        root.removeEventListener("transitioncancel", update);
    };
};

/** Puts a native checkbox back in step with its machine's state: after a click on a controlled
 *  checkbox whose owner didn't take the change, the browser has toggled the input anyway. Call it
 *  once the machine and the owner have handled the click. */
export const syncCheckedInput = (
    input: HTMLInputElement,
    checked: boolean | "indeterminate",
): void => {
    const on = checked === true;
    const mixed = checked === "indeterminate";
    if (input.checked !== on) input.checked = on;
    if (input.indeterminate !== mixed) input.indeterminate = mixed;
};

/** The native radios of a radio group, in order: every `input[type=radio]` inside its element. */
export const radioInputs = (
    group: Element | null | undefined,
): HTMLInputElement[] =>
    group
        ? [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
        : [];

/** Puts a radio group's native radios back in step with its value: after a click on a radio of a
 *  controlled group whose owner didn't take the change, the browser has checked it anyway. */
export const syncRadioInputs = (
    group: Element | null | undefined,
    value: string | null,
): void => {
    for (const input of radioInputs(group)) {
        const on = input.value === value;
        if (input.checked !== on) input.checked = on;
    }
};

/** Sets each native radio's default (what a form reset shows) to whether its value is `value`.
 *  Only a default that differs is written: writing one can check a radio the user hasn't
 *  touched. */
export const setRadioDefaults = (
    group: Element | null | undefined,
    value: string | null | undefined,
): void => {
    for (const input of radioInputs(group)) {
        const on = value != null && input.value === value;
        if (input.defaultChecked !== on) input.defaultChecked = on;
    }
};

/** Puts a text input or text area back in step with its machine's value: after typing into a
 *  controlled field whose owner didn't take the change, the browser shows the typed text anyway.
 *  An equal value is left alone, so the caret stays where it is. */
export const syncTextInput = (
    input: HTMLInputElement | HTMLTextAreaElement,
    value: string,
): void => {
    if (input.value !== value) input.value = value;
};

// The `z-index` each positioner was given here, so a later call knows an inline one of the app's.
const stacked = new WeakMap<HTMLElement, string>();

/** Stacks an overlay's positioner at its surface's layer, as Zag's popper does for a floating
 *  one: the surface's computed `z-index` (the preset's, from the theme's stacking scale) becomes
 *  the positioner's. A positioner fixed over the viewport, as the dialog's, makes a stacking
 *  context of its own, so the surface's `z-index` alone would stack it nowhere. An inline
 *  `z-index` of the app's own stays.
 *
 *  It runs in the next animation frame, before it's drawn: by then the overlay's opening has
 *  written all it writes, so reading the surface's style costs only the recalculation the frame
 *  needs anyway, where reading it at once would force one more. Returns what cancels it. */
export const stackPositioner = (
    positioner: HTMLElement,
    surface: HTMLElement,
): (() => void) => {
    const frame = requestAnimationFrame(() => stackNow(positioner, surface));
    return () => cancelAnimationFrame(frame);
};

const stackNow = (positioner: HTMLElement, surface: HTMLElement): void => {
    const own = positioner.style.zIndex;
    if (own && own !== stacked.get(positioner)) return;
    const { zIndex } = getComputedStyle(surface);
    if (zIndex === "auto") {
        positioner.style.removeProperty("z-index");
        stacked.delete(positioner);
        return;
    }
    // The `z-index` itself, not a custom property: one would be inherited, so changing it would
    // restyle everything inside the positioner.
    positioner.style.zIndex = zIndex;
    stacked.set(positioner, positioner.style.zIndex);
};

/** Calls `done` once every animation running on `element` now has ended, at once when none runs
 *  (an unstyled element, or styles not loaded). An animation cancelled instead of ending (the
 *  element restyled or removed) counts as ended. Returns what stops waiting. */
export const whenAnimationsEnd = (
    element: Element,
    done: () => void,
): (() => void) => {
    let waiting = true;
    const end = () => {
        if (!waiting) return;
        waiting = false;
        done();
    };
    const running = element.getAnimations?.() ?? [];
    if (running.length === 0) {
        end();
        return () => {};
    }
    void Promise.allSettled(running.map((motion) => motion.finished)).then(end);
    return () => {
        waiting = false;
    };
};

/** How far a page's fade, growth and slide had got: its opacity, `scale` and sideways offset. */
export interface PageFrame {
    readonly opacity: number;
    readonly scale: number;
    readonly x: number;
}

/** Reads `element`'s current opacity and scale, to carry on from if it changes course. */
export const readPageFrame = (element: Element): PageFrame => {
    const style = getComputedStyle(element);
    const scale = Number.parseFloat(style.scale);
    return {
        opacity: Number(style.opacity),
        scale: Number.isFinite(scale) ? scale : 1,
        x: new DOMMatrix(style.transform === "none" ? "" : style.transform).m41,
    };
};

/** After `element`'s styles have changed course (a page leaving is called back), starts from
 *  `from` rather than from the new animations' first frames: for each fade or growth they run,
 *  an animation of the same property and duration from `from` to rest, above them. CSS still
 *  drives the rest, and when `from` is already their start nothing is added. */
export const carryOn = (element: Element, from: PageFrame): void => {
    for (const motion of element.getAnimations?.() ?? []) {
        const effect = motion.effect as KeyframeEffect | null;
        const keyframes = effect?.getKeyframes?.() ?? [];
        const duration = Number(effect?.getComputedTiming().duration);
        if (!duration) continue;
        for (const [property, value, easing] of [
            ["opacity", from.opacity, "linear"],
            ["scale", from.scale, "ease-out"],
            ["transform", from.x, "ease-out"],
        ] as const) {
            if (!keyframes.some((frame) => property in frame)) continue;
            if (property === "transform") {
                if (Math.abs(value) < 0.5) continue;
            } else {
                const first = Number.parseFloat(
                    String(keyframes[0]?.[property]),
                );
                if (Math.abs(first - value) < 0.01) continue;
            }
            element.animate(
                {
                    [property]:
                        property === "transform"
                            ? [`translateX(${value}px)`, "translateX(0px)"]
                            : [value, 1],
                },
                { duration, easing },
            );
        }
    }
};

export {
    carouselRowPadding,
    measureCarouselRow,
    observeCarouselRow,
} from "./carousel-row";
export { swallowNextClick } from "./drag-click";
export {
    dragToDismiss,
    SHEET_POSITIONAL_THRESHOLD,
    SHEET_VELOCITY_THRESHOLD,
} from "./sheet-drag";
export type { SheetDrag, SheetDragOptions } from "./sheet-drag";
export { sideSheetDragToDismiss } from "./side-sheet-drag";
export { sidewaysDrag } from "./sideways-drag";
export type { SidewaysDragHooks } from "./sideways-drag";
export { splitterRelease, splitterRoom } from "./splitter-release";
export {
    createSwipeSettle,
    LIST_ITEM_SWIPE_SPRING,
} from "./list-item-swipe-settle";
export type { SwipeSettle } from "./list-item-swipe-settle";
export { focusableWhileOverflowing, scrollCellIntoList } from "./scroll-focus";
export { transitionTiming, watchCollapse } from "./collapse";
export {
    settleOnSpring,
    settleTransition,
    springFromVars,
    springRoleVar,
    transitionSpring,
} from "./settle";
export {
    MENU_DRILL_TIMING,
    menuDrillFrom,
    menuDrillTiming,
    menuDrillTo,
} from "./menu-drill-motion";
export type { MenuDrillSnapshot, MenuDrillTiming } from "./menu-drill-motion";
export { fabMenuStagger } from "./fab-menu-stagger";
export type { FabMenuStaggerOptions } from "./fab-menu-stagger";
export { markMenuGroupEdges } from "./menu-groups";
export {
    menuSubmenuBoundary,
    menuSubmenuPressed,
    menuSubmenuRoom,
    watchScroll,
    noteMenuSubmenuPresses,
} from "./menu-submenu-room";
export { revealInRow } from "./reveal";
export { slideIndicator, slideTransform, transformTiming } from "./slide";
export { moveToolbarFocus, watchOverflow } from "./toolbar-dom";
export type { OverflowWatch } from "./toolbar-dom";
export type { SlideTiming } from "./slide";
export {
    THEME_BLOCK_ATTRIBUTE,
    THEME_PRECEDENCE,
    generateThemeVars,
    generatedBlock,
    initialThemeBlock,
    loadThemeVars,
    needsThemeLoad,
    overrideVars,
    serverThemeCss,
    themeCss,
    themeSelector,
    unloadedThemeMessage,
} from "./web-theme";
export type { InitialBlockOptions, ThemeBlock } from "./web-theme";

/** What an app bar watches scroll on: an element that scrolls, or the window. */
export type ScrollTarget = Element | Window;

/** The vertical scroll offset of `target`, in px. */
export const scrollOffsetOf = (target: ScrollTarget): number =>
    "scrollY" in target ? target.scrollY : target.scrollTop;

/** Calls `onOffset` with `target`'s scroll offset now and on every scroll. Returns the cleanup. */
export const subscribeScroll = (
    target: ScrollTarget,
    onOffset: (offset: number) => void,
): VoidFunction => {
    const listener = () => onOffset(scrollOffsetOf(target));
    listener();
    target.addEventListener("scroll", listener, { passive: true });
    return () => target.removeEventListener("scroll", listener);
};

/** The inset icon's size and padding, and the handle's clearance, as the theme resolves them,
 *  read from where the styles put them: the icon's size is its box along the axis, and its
 *  padding how far it sits in from the start of the active track (or from the start of the
 *  inactive one, once it's `overflowing` there). The clearance is how far the inactive track (a
 *  sibling marked `data-pf-part="track"`) starts past the active track's end, read only while that
 *  track isn't moving; `last` keeps the one read before. The same on every web target, since it
 *  reads the layout and not a target's variables. `undefined` where the icon isn't placed by the
 *  preset (unstyled) or has no box. */
export const readSliderInsetIcon = (
    icon: Element,
    parent: Element,
    {
        vertical,
        overflowing,
        percents,
        centered = false,
        last,
    }: {
        vertical: boolean;
        overflowing: boolean;
        percents: readonly number[];
        centered?: boolean | undefined;
        last?: SliderInsetIconMeasures | undefined;
    },
): SliderInsetIconMeasures | undefined => {
    // Only the preset's placement (absolute, by insets) can be read back this way.
    if (getComputedStyle(icon).position !== "absolute") return undefined;
    const box = icon.getBoundingClientRect();
    const frame = parent.getBoundingClientRect();
    const size = vertical ? box.height : box.width;
    if (!(size > 0)) return undefined;
    const length = vertical ? frame.height : frame.width;
    const rtl = getComputedStyle(parent).direction === "rtl";
    const start = (rect: DOMRect) =>
        vertical
            ? frame.bottom - rect.bottom
            : rtl
              ? frame.right - rect.right
              : rect.left - frame.left;
    const { activeStart, activeEnd, endGap } = sliderTrackTokens(
        percents,
        centered,
    );
    const end = (length * activeEnd) / 100;
    const track = [...parent.children].find(
        (child) => child.getAttribute("data-pf-part") === "track",
    );
    const settled =
        track !== undefined &&
        !track.getAnimations().some((motion) => motion.playState === "running");
    const clearance =
        (settled
            ? sliderClearanceOf(
                  start(track.getBoundingClientRect()) - end,
                  endGap,
              )
            : undefined) ??
        last?.clearance ??
        SLIDER_INSET_ICON.clearance;
    const base = overflowing
        ? end + clearance * endGap
        : (length * activeStart) / 100;
    return {
        size: Math.round(size * 100) / 100,
        padding: Math.max(0, Math.round((start(box) - base) * 100) / 100),
        clearance,
    };
};

/** Puts `files` in a file input, as if chosen in its dialog (a form reset empties it). Does
 *  nothing where the browser has no `DataTransfer`. */
export const writeInputFiles = (
    input: HTMLInputElement,
    files: readonly File[],
): void => {
    if (typeof DataTransfer !== "function") return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
};
export {
    TOOLTIP_LONG_PRESS_MS,
    TOOLTIP_LONG_PRESS_STAY_MS,
    tooltipLongPress,
} from "./tooltip-long-press";
export type { TooltipLongPressOptions } from "./tooltip-long-press";
export {
    TOAST_SWIPE_VELOCITY_THRESHOLD,
    toastSwipeToDismiss,
} from "./toast-swipe";
export type { ToastSwipeOptions } from "./toast-swipe";
export {
    DIALOG_FOCUS_PROPS,
    dialogFocusMachineProps,
    fabMenuListProps,
    POPOVER_DOM_ROOT_PROPS,
    popoverDomMachineProps,
    RIPPLE_DOM_ROOT_PROPS,
    rippleDomMachineProps,
    searchViewDomDialogProps,
} from "./components";
export type {
    DialogFocusProps,
    FileUploadDomBehaviorProps,
    FileUploadDomContentProps,
    FileUploadDomRootOwnProps,
    FileUploadDomValueDetails,
    PopoverDomRootOwnProps,
    PopoverFocusProps,
    RippleDomProps,
    RippleDomRootOwnProps,
} from "./components";
export { SNACKBAR_ANNOUNCEMENT_STYLE } from "./snackbar-announcement";
