// Controlled and uncontrolled state, in Zag's shape: a value prop, its `default*` prop, and an
// `on*Change` callback with a details object. A defined value prop controls the state; switching
// between the two warns in development; a form reset reports `reason: "reset"`.

/** Why a change callback was called, when it wasn't a direct user action on the component. */
export type ChangeReason = "reset";

/** What a change callback gets: `{ checked }`, plus `reason: "reset"` for a form reset. */
export type ChangeDetails<N extends string, T> = { readonly [K in N]: T } & {
    readonly reason?: ChangeReason;
};

/** `"checked"` → `"defaultChecked"`. */
export type DefaultName<N extends string> = `default${Capitalize<N>}`;

/** `"checked"` → `"onCheckedChange"`. */
export type ChangeName<N extends string> = `on${Capitalize<N>}Change`;

/** The three props of a piece of state a user can change: `Controllable<"checked", boolean>` is
 *  `checked`, `defaultChecked`, and `onCheckedChange(details)`. `D` is the details object. */
export type Controllable<
    N extends string,
    T,
    D extends object = ChangeDetails<N, T>,
> = { readonly [K in N]?: T | undefined } & {
    /** @control none */
    readonly [K in DefaultName<N>]?: T | undefined;
} & {
    readonly [K in ChangeName<N>]?: ((details: D) => void) | undefined;
};

/** The names of a controllable prop's three props. */
export interface ControllableNames<N extends string> {
    readonly value: N;
    readonly defaultValue: DefaultName<N>;
    readonly onChange: ChangeName<N>;
}

const capitalize = <N extends string>(name: N): Capitalize<N> =>
    (name.charAt(0).toUpperCase() + name.slice(1)) as Capitalize<N>;

/** `controllableNames("checked")` → `{ value: "checked", defaultValue: "defaultChecked",
 *  onChange: "onCheckedChange" }`. */
export const controllableNames = <N extends string>(
    name: N,
): ControllableNames<N> => ({
    value: name,
    defaultValue: `default${capitalize(name)}`,
    onChange: `on${capitalize(name)}Change`,
});

/** The warning for a component whose value prop changed between defined and `undefined`. */
export const controlSwitchMessage = (
    component: string,
    name: string,
    nowControlled: boolean,
): string => {
    const names = controllableNames(name);
    const [from, to] = nowControlled
        ? ["uncontrolled", "controlled"]
        : ["controlled", "uncontrolled"];
    return `pureform: ${component} switched \`${names.value}\` from ${from} to ${to}. Pass \`${names.value}\` (controlled) or \`${names.defaultValue}\` (uncontrolled) for the component's whole life; \`undefined\` means uncontrolled.`;
};

/** Follows whether a value prop is controlled, and calls `warn` with `controlSwitchMessage` the
 *  first time it switches. Feed it `value !== undefined` on every change. */
export const createControlTracker = (
    component: string,
    name: string,
    initiallyControlled: boolean,
    warn: (message: string) => void,
): ((controlled: boolean) => void) => {
    let warned = false;
    return (controlled) => {
        if (warned || controlled === initiallyControlled) return;
        warned = true;
        warn(controlSwitchMessage(component, name, controlled));
    };
};

/** Marks the change callbacks a form reset causes with `reason: "reset"`. A machine can change
 *  for a reset at two moments: when the binding sends it the default after the browser's reset
 *  (`during`), and during the form's `reset` event, where Zag's machines put their state back
 *  to its value at creation (`untilNextTask`). Callbacks go through `report`. */
export interface ChangeReasonTracker {
    /** Runs `update` (a machine send) so the callbacks it causes report `reason: "reset"`. The
     *  mark clears in a microtask queued after the update's, so a reset that changes nothing
     *  doesn't mark the next user action. */
    during(update: () => void): void;
    /** Marks callbacks until the next task, or drops them with `drop`: for the form's `reset`
     *  event, before the machine's own reset listener runs. Drop them when controlled, since
     *  Zag resets to the value at creation, and the binding reports the default afterwards. */
    untilNextTask(options?: { readonly drop?: boolean }): void;
    /** Calls `callback` with `details`, plus `reason: "reset"` while marked; not at all while
     *  dropping. */
    report<D extends object>(
        callback:
            | ((details: D & { readonly reason?: ChangeReason }) => void)
            | undefined,
        details: D,
    ): void;
}

export const createChangeReason = (): ChangeReasonTracker => {
    let marking = 0;
    let dropping = 0;
    return {
        during(update) {
            marking++;
            try {
                update();
            } finally {
                queueMicrotask(() => {
                    marking--;
                });
            }
        },
        untilNextTask(options) {
            const drop = options?.drop === true;
            if (drop) dropping++;
            else marking++;
            setTimeout(() => {
                if (drop) dropping--;
                else marking--;
            });
        },
        report(callback, details) {
            if (dropping > 0 || !callback) return;
            callback(marking > 0 ? { ...details, reason: "reset" } : details);
        },
    };
};

/** The machine props for one controllable value: `{ checked, defaultChecked, onCheckedChange }`. */
export type ControllableMachineProps<N extends string, T, D extends object> = {
    [K in N]: T | undefined;
} & { [K in DefaultName<N>]: T | undefined } & {
    [K in ChangeName<N>]: (details: D) => void;
};
