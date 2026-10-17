// What the shared suites know about a component, without naming a framework. Each component has
// one file here (`button.ts`, `checkbox.ts`) and an entry in `index.ts`; every suite runs over
// the list and uses the parts a component declares. A part left out skips the suite's cases for
// it (a component with no `state` has nothing controllable).

import type { ComponentName, SceneProps } from "../harness/scene";

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
export type FormControl = HTMLInputElement | HTMLButtonElement;

/** How the component takes part in a native form (design doc §9.5). */
export interface FormCase {
    /** The native element the browser treats as the form control. */
    control(host: HTMLElement): FormControl;
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
}

export interface KeyboardCase {
    /** The element Tab moves focus to, and where focus is after each key: a radio group's
     *  checked radio, which an arrow key moves. */
    focusable(host: HTMLElement): HTMLElement;
    readonly keys: readonly KeyCase[];
    /** Arrow keys by direction. Left out: arrows do nothing in either direction. */
    readonly arrows?:
        | {
              readonly [D in "ltr" | "rtl"]: readonly KeyCase[];
          }
        | undefined;
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
    readonly state?: StateCase | undefined;
    readonly form?: FormCase | undefined;
    readonly keyboard: KeyboardCase;
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
