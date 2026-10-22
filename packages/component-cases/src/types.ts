// What the shared suites know about a component, without naming a framework. Each component has
// one file here (`button.ts`, `checkbox.ts`) and an entry in `index.ts`; every suite runs over
// the list and uses the parts a component declares. A part left out skips the suite's cases for
// it (a component with no `state` has nothing controllable).

import type { IndicationAnatomy } from "@pureform/anatomy";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";

import type { ComponentName, SceneProps } from "./scene";

/** The component's state a user changes, for the controllable rules (design doc §9.4). */
export interface StateCase<T = unknown> {
    /** The state's prop: `checked` gives `checked`, `defaultChecked`, and `onCheckedChange`. */
    readonly prop: string;
    /** The value the state starts at, and the value one `act` moves it to. */
    readonly from: T;
    readonly to: T;
    /** Props every scene of the state gets besides the three. */
    readonly props?: SceneProps | undefined;
    /** One user action that changes the state: a click. `force` skips the checks that the
     *  element can take it (for a disabled one). */
    act(host: HTMLElement, options?: ActOptions): Promise<void>;
    /** The state the page shows (the native element, ARIA, `data-state`), throwing if they
     *  disagree. */
    read(host: HTMLElement): T;
}

export interface ActOptions {
    readonly force?: boolean;
}

/** The native element a component submits, disables, and validates with. */
export type FormControl =
    | HTMLInputElement
    | HTMLButtonElement
    | HTMLTextAreaElement
    | HTMLSelectElement;

/** How the component takes part in a native form (design doc §9.5). */
export interface FormCase {
    /** The native element the browser treats as the form control. */
    control(host: HTMLElement): FormControl;
    /** The element assistive technology reads, which carries `aria-invalid`, when it isn't
     *  `control`: a select's combobox, over its hidden native select. */
    aria?(host: HTMLElement): HTMLElement;
    /** Whether the machine shows the component disabled (`data-disabled`, `aria-disabled`). */
    disabled(host: HTMLElement): boolean;
    /** Props under which it submits, and the entries it adds to the form's data. */
    readonly submits: {
        readonly props: SceneProps;
        readonly entries: readonly (readonly [string, string])[];
    };
    /** Props under which it's named but adds nothing (an unchecked checkbox). */
    readonly omits?: SceneProps | undefined;
    /** It submits the form itself, as the submitter (a submit button), rather than being
     *  submitted by it. */
    readonly submitter?: boolean | undefined;
    /** A form reset puts its `state` back to the default. */
    readonly resets?: boolean | undefined;
    /** `required` blocks submitting until `satisfy` runs. */
    readonly required?:
        | {
              readonly props: SceneProps;
              satisfy(host: HTMLElement, options?: ActOptions): Promise<void>;
          }
        | undefined;
    /** `invalid` marks the control with `aria-invalid`. */
    readonly invalid?: { readonly props: SceneProps } | undefined;
    /** `error` sets `invalid` and blocks submitting with its message. */
    readonly error?:
        | { readonly props: SceneProps; readonly message: string }
        | undefined;
}

/** What a key does to the focused component: clicks it (its `onClick` runs once), moves its
 *  `state` from `from` to `to`, or nothing. */
export type KeyEffect = "click" | "change" | "nothing";

export interface KeyCase {
    /** The key, in `userEvent.keyboard` syntax: `"{Enter}"`, `" "`. */
    readonly key: string;
    readonly does: KeyEffect;
    /** The state a change moves to, when it isn't the state's `to`: an arrow key in a radio
     *  group moves to the radio before or after. */
    readonly to?: unknown;
    /** Props for this case, over the component's. */
    readonly props?: SceneProps | undefined;
    /** Where focus is after the key, when the key moves it (a toolbar's arrow keys). Left out:
     *  it stays on `keyboard.focusable`. */
    focuses?(host: HTMLElement): HTMLElement;
}

export interface KeyboardCase {
    /** The element Tab moves focus to, and where focus is after each key: a radio group's
     *  checked radio, which an arrow key moves. */
    focusable(host: HTMLElement): HTMLElement;
    readonly keys: readonly KeyCase[];
    /** `false` for a component with no disabled state of its own (an overlay, whose trigger the
     *  app disables): Tab isn't checked to skip it. */
    readonly disables?: false | undefined;
    /** The state focus moves it to on its own, which each key starts from: a tooltip opens when
     *  Tab reaches its trigger. Left out: focus changes nothing. */
    readonly focused?: unknown;
    /** Arrow keys by direction. Left out: arrows do nothing in either direction. */
    readonly arrows?:
        | {
              readonly [D in "ltr" | "rtl"]: readonly KeyCase[];
          }
        | undefined;
}

/** An anatomy with its indication entries: its scope and parts find the elements each entry
 *  names (`[data-scope][data-pf-part]`). */
export interface IndicatedAnatomy {
    readonly scope: string;
    readonly parts: Readonly<Record<string, { readonly attribute: string }>>;
    readonly indication?: readonly IndicationAnatomy[];
}

/** Where a component shows indication, for the indication suite (design doc §9.8). Each entry
 *  of the anatomy's `indication` is checked on the first element its parts match: a composite's
 *  first item. */
export interface IndicationCase {
    /** The anatomy the component's indication entries come from. */
    readonly anatomy: IndicatedAnatomy;
    /** Props that show every surface (an open menu), over the component's. */
    readonly props?: SceneProps | undefined;
    /** What shows the surfaces once mounted, when props alone can't (a select's list). */
    open?(host: HTMLElement): Promise<void>;
    /** Props that give the checked surface `source`: the root's `interactionSource`, or the
     *  first item's. Left out where the ready-made component takes no source (the snackbar). */
    source?(source: MutableInteractionSource): SceneProps;
    /** Props that disable the checked surface while it's mounted: the component, or the
     *  composite. Left out for a component with no disabled state (the snackbar). */
    readonly disabled?: SceneProps | undefined;
    /** For a composite: props that give the first item `source` and disable it alone. */
    itemDisabled?(source: MutableInteractionSource): SceneProps;
    /** Keyboard focus reaching the checked surface's trigger, when Tab alone doesn't: a menu's
     *  item, which a highlight shows as hovered. */
    focus?(host: HTMLElement): Promise<void>;
    /** Whether a drag tints the surface (the slider). */
    readonly drags?: boolean | undefined;
    /** Whether the surface is in a modal (the search view), which keeps the pointer off the rest
     *  of the page, so another component sharing its source can't be pressed. */
    readonly modal?: boolean | undefined;
}

export interface ComponentCase {
    readonly component: ComponentName;
    /** Props every scene of the component gets: an accessible name. */
    readonly props: SceneProps;
    /** The root's test id (`testIds.<component>.root`). */
    readonly root: string;
    /** Renderings that cover its variants and states. The accessibility, direction, and server
     *  rendering suites run each; keep them plain data, since the server gets them too. */
    readonly examples: Readonly<Record<string, SceneProps>>;
    /** Parts (`data-pf-part` names) that draw the same in both directions, such as a check
     *  mark: their physical borders, corners, and transform must match between `ltr` and `rtl`.
     *  The mirrored-box check can't see this, since their boxes are symmetric. */
    readonly unmirrored?: readonly string[] | undefined;
    /** Parts that keep their place in both directions, such as a clock dial's numbers: their
     *  boxes in `rtl` match their `ltr` boxes rather than mirror them. */
    readonly fixed?: readonly string[] | undefined;
    /** Renderings with an overlay open. Zag places a floating overlay, and hides the page around a
     *  modal one, only in the browser, so the server rendering suite can't hydrate them unchanged:
     *  the accessibility and direction suites run these in the browser alone. */
    readonly opened?: Readonly<Record<string, SceneProps>> | undefined;
    readonly state?: StateCase | undefined;
    readonly form?: FormCase | undefined;
    /** Left out for a component focus never reaches (a progress indicator, an avatar): Tab passes
     *  over it. */
    readonly keyboard?: KeyboardCase | undefined;
    /** `false` for a component that draws no color from the scheme (text, a touch target), which
     *  a theme that only recolors can't change: the themes suite skips "draws differently". */
    readonly themed?: false | undefined;
    /** Props the themes suite renders it with, over the component's, when its own render nothing
     *  the theme colors until the browser runs (a toaster, whose toasts come in on the client). */
    readonly themedProps?: SceneProps | undefined;
    /** Where it shows indication, for an interactive component (an anatomy with `indication`
     *  entries). */
    readonly indication?: IndicationCase | undefined;
    /** `true` for a component that lays itself out from measuring the page once mounted (the
     *  carousel sizes its items from the row's width): hydrating it changes those sizes, so the
     *  hydration suites check it logs nothing, but not that nothing changed. */
    readonly measured?: true | undefined;
    /** How it comes and goes, for an overlay. */
    readonly overlay?: OverlayCase | undefined;
}

/** How an overlay comes and goes, for the overlays suite: it opens and closes with its `open`
 *  prop, stacks over what follows it in the page, and animates in and out. */
export interface OverlayCase {
    /** The surface: what animates and stacks, which Zag marks with `data-state`. */
    surface(host: HTMLElement): HTMLElement;
    /** The other parts that show and hide with it: its positioner, a dialog's backdrop. */
    parts(host: HTMLElement): readonly HTMLElement[];
    /** Props it's mounted with, besides `open`. */
    readonly props?: SceneProps | undefined;
    /** Places it as an app would, where placing it is the app's (the snackbar). */
    place?(host: HTMLElement): void;
}

/** The element with a test id inside `host`. */
export const byTestId = <E extends HTMLElement = HTMLElement>(
    host: ParentNode,
    id: string,
): E => {
    const element = host.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

/** A component with one surface: the root takes the source, and `disabled` disables it. */
export const ownSource = (
    anatomy: IndicatedAnatomy,
    extra: Partial<IndicationCase> = {},
): IndicationCase => ({
    anatomy,
    source: (interactionSource) => ({ interactionSource }),
    disabled: { disabled: true },
    ...extra,
});

/** A composite whose items (`items`) each take a source: the first item gets it, and is the
 *  one disabled alone; `disabled` disables the composite. */
export const itemSources = (
    anatomy: IndicatedAnatomy,
    items: readonly Readonly<Record<string, unknown>>[],
    extra: Partial<IndicationCase> = {},
): IndicationCase => {
    const first = (props: Readonly<Record<string, unknown>>) => ({
        items: items.map((item, index) =>
            index === 0 ? { ...item, ...props } : item,
        ),
    });
    return {
        anatomy,
        source: (interactionSource) => first({ interactionSource }),
        disabled: { disabled: true },
        itemDisabled: (interactionSource) =>
            first({ interactionSource, disabled: true }),
        ...extra,
    };
};
