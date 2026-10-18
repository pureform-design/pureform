// How the web bindings tie an indication to a component's elements: for each surface (an anatomy
// indication entry, and the interaction source feeding it), the elements its parts render, the
// indication's effect once they're mounted, and the hover and press that came from elsewhere,
// which the binding marks on the element that shows them (`data-pf-hover`, `data-pf-active`).
// Framework-free: each binding attaches elements from its own after-mount hooks.

import type { IndicationAnatomy } from "@pureform/anatomy";

import type { Indication, IndicationContext } from "./indication";
import type { Interaction, InteractionSource } from "./interaction";
import type { AnyRegistry, Direction } from "./provider";

/** What an element is to a surface's indication: the `trigger` whose interactions feed the
 *  source, the `surface` it draws on, and the `state` element the preset matches hover and press
 *  on (the trigger, or the root around a native input). The layer inside the surface isn't
 *  attached: the effect finds it when it draws (`surfaceLayer`). */
export type IndicationRole = "trigger" | "surface" | "state";

/** A hover or press that came from elsewhere: another element sharing the source, or the app
 *  emitting with no element. Focus is never forwarded. */
export interface ForwardedStates {
    readonly hover: boolean;
    readonly pressed: boolean;
}

/** Nothing forwarded. */
export const NOT_FORWARDED: ForwardedStates = Object.freeze({
    hover: false,
    pressed: false,
});

/** A part's roles in a component's indication entries, by entry: an anatomy's `input` trigger
 *  shows its states on `root`, the label around it, as the preset matches them there. The same
 *  list on every call for the same entries and part. */
export const indicationRoles = (
    entries: readonly IndicationAnatomy[] | undefined,
    part: string,
): readonly { readonly entry: number; readonly role: IndicationRole }[] => {
    if (!entries) return NO_ROLES;
    let byPart = rolesCache.get(entries);
    if (!byPart) {
        byPart = new Map();
        rolesCache.set(entries, byPart);
    }
    let roles = byPart.get(part);
    if (!roles) {
        roles = partRoles(entries, part);
        byPart.set(part, roles);
    }
    return roles;
};

type Roles = readonly {
    readonly entry: number;
    readonly role: IndicationRole;
}[];

// The same list for the same anatomy and part, so frameworks can compare it by identity.
const rolesCache = new WeakMap<
    readonly IndicationAnatomy[],
    Map<string, Roles>
>();

const partRoles = (
    entries: readonly IndicationAnatomy[],
    part: string,
): Roles => {
    const roles: { entry: number; role: IndicationRole }[] = [];
    entries.forEach((entry, index) => {
        if (entry.trigger === part)
            roles.push({ entry: index, role: "trigger" });
        if (entry.surface === part)
            roles.push({ entry: index, role: "surface" });
        if (stateIndicationPart(entry) === part) {
            roles.push({ entry: index, role: "state" });
        }
    });
    return roles.length ? roles : NO_ROLES;
};

const NO_ROLES: readonly never[] = Object.freeze([]);

/** The part an entry's forwarded hover and press are marked on: its trigger, or `root` for a
 *  native input inside a label. */
export const stateIndicationPart = (entry: IndicationAnatomy): string =>
    entry.trigger === "input" ? "root" : entry.trigger;

/** The layer element a surface holds for its indication to draw in: its child marked
 *  `data-ripple-layer`, which the bindings render first inside it. */
export const surfaceLayer = (surface: HTMLElement): HTMLElement | undefined =>
    surface.querySelector<HTMLElement>(":scope > [data-ripple-layer]") ??
    undefined;

/** What a component's indication reads besides its elements. */
export interface IndicationEnvironment {
    reducedMotion(): boolean;
    dir(): Direction;
}

/** One surface's indication: its elements, the effect over them, and what's forwarded to it. */
export class IndicationInstance {
    readonly source: InteractionSource;
    readonly #host: IndicationHost;
    readonly #centered: boolean;
    readonly #elements = new Map<IndicationRole, HTMLElement>();
    readonly #listeners = new Set<(states: ForwardedStates) => void>();
    #users = 0;
    #effect: { indication: Indication; cleanup: () => void } | undefined;
    #unsubscribe: (() => void) | undefined;
    #hovers = 0;
    readonly #presses = new Set<number>();
    #forwarded: ForwardedStates = NOT_FORWARDED;

    constructor(
        host: IndicationHost,
        source: InteractionSource,
        centered: boolean,
    ) {
        this.#host = host;
        this.source = source;
        this.#centered = centered;
    }

    /** The hover and press forwarded to it now. */
    get forwarded(): ForwardedStates {
        return this.#forwarded;
    }

    /** Sets an element, once it's mounted; returns what unsets it. */
    attach(role: IndicationRole, element: HTMLElement): () => void {
        this.#users++;
        this.#elements.set(role, element);
        this.update();
        return () => {
            if (this.#elements.get(role) === element) {
                this.#elements.delete(role);
                this.update();
            }
            this.#release();
        };
    }

    /** Calls `listener` with what's forwarded each time it changes; returns what stops it. */
    subscribeForwarded(
        listener: (states: ForwardedStates) => void,
    ): () => void {
        this.#users++;
        this.#listeners.add(listener);
        this.#unsubscribe ??= this.source.subscribe(this.#onInteraction);
        return () => {
            this.#listeners.delete(listener);
            if (this.#listeners.size === 0) this.#stopForwarding();
            this.#release();
        };
    }

    /** Starts the indication's effect once its trigger and surface are there, and restarts it
     *  when the indication changes; stops it when one goes. The layer is found in the surface
     *  each time the effect reads it, so the bindings needn't track it as it mounts. */
    update(): void {
        const { indication, registry } = this.#host;
        const trigger = this.#elements.get("trigger");
        const surface = this.#elements.get("surface");
        const ready =
            indication?.web !== undefined &&
            registry !== undefined &&
            trigger !== undefined &&
            surface !== undefined;
        if (this.#effect?.indication === indication && ready) return;
        this.#effect?.cleanup();
        this.#effect = undefined;
        if (!ready || !indication?.web || !trigger || !surface || !registry) {
            return;
        }
        const context: IndicationContext = {
            centered: this.#centered,
            reducedMotion: () => this.#host.environment.reducedMotion(),
            dir: () => this.#host.environment.dir(),
            registry,
        };
        const target = {
            trigger,
            surface,
            get layer() {
                return indication.layer ? surfaceLayer(surface) : undefined;
            },
        };
        const cleanup = indication.web(target, this.source, context);
        this.#effect = { indication, cleanup };
    }

    #owns(origin: unknown): boolean {
        for (const element of this.#elements.values()) {
            if (element === origin) return true;
        }
        return false;
    }

    readonly #onInteraction = (
        interaction: Interaction,
        _state: unknown,
        origin: unknown,
    ): void => {
        switch (interaction.type) {
            case "hoverEnter":
                if (!this.#owns(origin)) this.#hovers++;
                break;
            case "hoverExit":
                if (!this.#owns(origin))
                    this.#hovers = Math.max(0, this.#hovers - 1);
                break;
            case "press":
                if (!this.#owns(origin)) this.#presses.add(interaction.id);
                break;
            case "release":
            case "cancel":
                this.#presses.delete(interaction.id);
                break;
            default:
                return;
        }
        const hover = this.#hovers > 0;
        const pressed = this.#presses.size > 0;
        if (
            hover === this.#forwarded.hover &&
            pressed === this.#forwarded.pressed
        ) {
            return;
        }
        this.#forwarded = { hover, pressed };
        for (const listener of this.#listeners) listener(this.#forwarded);
    };

    #stopForwarding(): void {
        this.#unsubscribe?.();
        this.#unsubscribe = undefined;
        this.#hovers = 0;
        this.#presses.clear();
        this.#forwarded = NOT_FORWARDED;
    }

    #release(): void {
        if (--this.#users > 0) return;
        this.#effect?.cleanup();
        this.#effect = undefined;
        this.#stopForwarding();
        this.#host.forget(this);
    }
}

/** A component's indications: one instance per surface and source, made when a part first asks
 *  and dropped when the last lets go. */
export class IndicationHost {
    readonly environment: IndicationEnvironment;
    readonly #entries: readonly IndicationAnatomy[];
    readonly #instances = new Map<
        number,
        Map<InteractionSource, IndicationInstance>
    >();
    #indication: Indication | undefined;
    #registry: AnyRegistry | undefined;

    constructor(
        entries: readonly IndicationAnatomy[] | undefined,
        environment: IndicationEnvironment,
    ) {
        this.#entries = entries ?? [];
        this.environment = environment;
    }

    /** The indication in effect and the registry it draws with. */
    get indication(): Indication | undefined {
        return this.#indication;
    }

    get registry(): AnyRegistry | undefined {
        return this.#registry;
    }

    /** Sets the indication in effect, restarting the effects of every instance when it or the
     *  registry changed. */
    configure(
        indication: Indication | undefined,
        registry: AnyRegistry | undefined,
    ): void {
        if (indication === this.#indication && registry === this.#registry)
            return;
        this.#indication = indication;
        this.#registry = registry;
        for (const instances of this.#instances.values()) {
            for (const instance of instances.values()) instance.update();
        }
    }

    /** The instance for an entry's surface fed by `source`. Attach an element or subscribe to
     *  keep it; it's dropped when the last lets go. */
    instance(entry: number, source: InteractionSource): IndicationInstance {
        let instances = this.#instances.get(entry);
        if (!instances) {
            instances = new Map();
            this.#instances.set(entry, instances);
        }
        let instance = instances.get(source);
        if (!instance) {
            instance = new IndicationInstance(
                this,
                source,
                this.#entries[entry]?.centered ?? false,
            );
            instances.set(source, instance);
        }
        return instance;
    }

    /** Drops an instance nothing uses. */
    forget(instance: IndicationInstance): void {
        for (const instances of this.#instances.values()) {
            if (instances.get(instance.source) === instance) {
                instances.delete(instance.source);
            }
        }
    }
}
