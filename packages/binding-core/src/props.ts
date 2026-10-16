// Merging a part's props from several sources in order (machine, part attributes, states,
// registry, provider, user): classes and styles combine, event handlers all run, and any other
// key takes the last defined value. The binding says how classes and styles combine, since Solid
// and React write them differently.

type Dict = Readonly<Record<string, unknown>>;

/** How a binding combines what can't simply be overridden. */
export interface CombineRules {
    /** The keys holding classes: `["class"]` in Solid, `["className"]` in React. */
    readonly classKeys: readonly string[];
    /** Joins the defined class values in order: an array in Solid, a string in React. */
    readonly joinClasses: (values: readonly unknown[]) => unknown;
    /** Joins the defined `style` values in order, later declarations winning. */
    readonly joinStyles: (values: readonly unknown[]) => unknown;
    /** Whether a value under an `on*` key is a handler to chain. Default: a function. */
    readonly isHandler?: (value: unknown) => boolean;
    /** Calls a handler with the event. Default: `handler(event)`. */
    readonly callHandler?: (handler: unknown, event: unknown) => void;
}

const HANDLER_KEY = /^on[A-Z]/;

const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
    typeof value === "function";

/** Every source's props in one object. Classes and styles join by `rules`; handlers under the
 *  same `on*` key are chained, earlier sources first; any other key takes the last value that
 *  isn't `undefined`. `undefined` sources are skipped. */
export const combineProps = (
    sources: readonly (Dict | undefined)[],
    rules: CombineRules,
): Record<string, unknown> => {
    const isHandler = rules.isHandler ?? isFunction;
    const call =
        rules.callHandler ??
        ((handler: unknown, event: unknown) =>
            (handler as (event: unknown) => void)(event));
    const result: Record<string, unknown> = {};
    const classes: unknown[] = [];
    const styles: unknown[] = [];
    const handlers = new Map<string, unknown[]>();
    for (const source of sources) {
        if (!source) continue;
        for (const key of Object.keys(source)) {
            const value = source[key];
            if (value === undefined) continue;
            if (rules.classKeys.includes(key)) {
                classes.push(value);
            } else if (key === "style") {
                styles.push(value);
            } else if (HANDLER_KEY.test(key) && isHandler(value)) {
                const list = handlers.get(key);
                if (list) list.push(value);
                else handlers.set(key, [value]);
                result[key] = value;
            } else {
                result[key] = value;
            }
        }
    }
    if (classes.length > 0) {
        result[rules.classKeys[0]!] = rules.joinClasses(classes);
    }
    if (styles.length > 0) {
        result["style"] =
            styles.length === 1 ? styles[0] : rules.joinStyles(styles);
    }
    for (const [key, list] of handlers) {
        // A later non-handler value under the same key replaced the chain.
        if (result[key] !== list[list.length - 1]) continue;
        result[key] =
            list.length === 1
                ? list[0]
                : (event: unknown) => {
                      for (const handler of list) call(handler, event);
                  };
    }
    return result;
};

/** Style objects merged in order, later keys winning. */
export const mergeStyleObjects = (
    styles: readonly (Dict | undefined)[],
): Record<string, unknown> => Object.assign({}, ...styles);
