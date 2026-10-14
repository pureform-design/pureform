// Material 3 press ripples.
//
// A press grows a ripple from the press point toward the center of the surface and holds it
// while the pointer stays down. Release fades it out, but never before a minimum press time,
// so a quick tap still shows most of the ripple. Touch presses wait briefly so a scroll does not
// ripple, and a keyboard click ripples from the center. The timing comes from the ripple
// layer's transition, so motion tokens drive it, and falls back to Material's ripple timing.
//
// Two variants share that press handling and differ only in how a ripple is drawn:
// - `ink-well`: Material's reference ripple, a soft-edged circle animated with CSS transforms.
// - `ink-sparkle`: Material's sparkle ripple (Flutter's `InkSparkle`), drawn on a canvas as a
//   faint fill with a shimmering ring of sparkles that expands with it and thins out as the
//   ripple reaches full size.

const PRESS_GROW_MS = 450;
const FADE_MS = 375;
const TOUCH_DELAY_MS = 150;
const INITIAL_ORIGIN_SCALE = 0.2;
const PADDING = 10;
const SOFT_EDGE_MINIMUM_SIZE = 75;
const SOFT_EDGE_CONTAINER_RATIO = 0.35;
const STANDARD_EASING = "cubic-bezier(0.2, 0, 0, 1)";

/** How long a ripple grows and fades, and the grow curve. A release waits for at least half
 *  the grow, so a quick tap still shows most of the ripple. */
export type RippleTiming = {
    /** Grow duration, in ms. */
    grow: number;
    /** Fade duration, in ms. */
    fade: number;
    /** CSS easing for the grow. */
    easing: string;
};

const DEFAULT_TIMING: RippleTiming = {
    grow: PRESS_GROW_MS,
    fade: FADE_MS,
    easing: STANDARD_EASING,
};

// Split a computed list on top-level commas, keeping `cubic-bezier(a, b, c, d)` whole.
const splitList = (value: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of value) {
        if (char === "(") depth++;
        if (char === ")") depth--;
        if (char === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
};

const toMs = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const n = Number.parseFloat(value);
    if (Number.isNaN(n)) return undefined;
    return value.endsWith("ms") ? n : n * 1000;
};

/** Read the timing a ripple layer declares through its transition: the `transform` entry
 *  times the grow and the `opacity` entry the fade. Missing entries keep `fallback`. */
export function readRippleTiming(
    style: Pick<
        CSSStyleDeclaration,
        "transitionProperty" | "transitionDuration" | "transitionTimingFunction"
    >,
    fallback: RippleTiming = DEFAULT_TIMING,
): RippleTiming {
    const properties = splitList(style.transitionProperty);
    const durations = splitList(style.transitionDuration);
    const easings = splitList(style.transitionTimingFunction);
    // CSS repeats a shorter list to match the property count.
    const at = (list: string[], i: number) => list[i % list.length];
    const grow = properties.indexOf("transform");
    const fade = properties.indexOf("opacity");
    const ms = (i: number) => (i < 0 ? undefined : toMs(at(durations, i)));
    return {
        grow: ms(grow) || fallback.grow,
        fade: ms(fade) || fallback.fade,
        easing: (grow < 0 ? undefined : at(easings, grow)) || fallback.easing,
    };
}

type CssClasses = { [key: string]: boolean } | string | string[];

export type RippleVariant = "ink-well" | "ink-sparkle";

export type SparkleOptions = {
    /** Opacity of the fill behind the sparkles. Default `0.1`, the pressed state opacity. */
    fillOpacity?: number;
    /** Peak opacity of a sparkle. Default `0.3`. */
    sparkleOpacity?: number;
    /** Sparkles per pixel of the ring they ride, drawn fresh each frame. Default `0.2`. */
    density?: number;
};

export type RippleOptions = {
    /** How the ripple is drawn. Default `"ink-well"`. */
    variant?: RippleVariant;
    /** Classes for each ripple element, usually the preset's ripple slot class. */
    class?: CssClasses;
    /** The ripple color. Default: the ink well takes it from its class, and the sparkle uses
     *  the layer's text color. */
    color?: string;
    /** Element to use for each ink-well ripple. Default: a new `span`. */
    createElement?: () => HTMLElement;
    /** Find the layer the ripples are drawn in. Default: the `[data-ripple-layer]` child. */
    getRippleLayer?: (container: HTMLElement) => HTMLElement | null;
    /** Always grow from the center, as icon buttons do. */
    centerOrigin?: boolean;
    /** Skip ripples, for example while the control is disabled. A disabled form control is
     *  skipped without this. */
    disabled?: boolean | (() => boolean);
    /** Let an ancestor surface ripple for the same press too. By default the innermost
     *  surface claims the press. */
    allowPropagation?: boolean;
    /** Fixed timing. Default: read from the layer's transition (the preset's ripple layer
     *  declares the motion tokens there), falling back to Material's ripple timing. */
    timing?: Partial<RippleTiming>;
    /** Tuning for the `ink-sparkle` variant. */
    sparkle?: SparkleOptions;
};

function normalizeClass(cls: CssClasses): string[] {
    if (typeof cls === "string") return cls.split(" ").filter(Boolean);
    if (Array.isArray(cls)) return cls;
    return Object.keys(cls).filter((key) => cls[key]);
}

// Events already claimed by an inner surface, so nested surfaces ripple once per press.
const claimed = new WeakSet<Event>();

function claim(e: Event, allowPropagation: boolean): boolean {
    if (claimed.has(e)) return false;
    if (!allowPropagation) claimed.add(e);
    return true;
}

function isDisabled(container: HTMLElement, options: RippleOptions) {
    const disabled =
        typeof options.disabled === "function"
            ? options.disabled()
            : options.disabled;
    return (
        disabled === true ||
        container.matches(":disabled, [aria-disabled='true']")
    );
}

type Point = { x: number; y: number };

/** Geometry of one ripple in a layer of the given size, pressed at `origin`. `size` is the
 *  starting diameter and `scale` the factor it grows by; `start` and `end` are the top-left
 *  corner of the starting circle at the press point and at the center. */
export function rippleGeometry(
    rect: { width: number; height: number },
    origin: Point,
) {
    const { width, height } = rect;
    const maxDim = Math.max(width, height);
    const softEdge = Math.max(
        SOFT_EDGE_CONTAINER_RATIO * maxDim,
        SOFT_EDGE_MINIMUM_SIZE,
    );
    const size = Math.floor(maxDim * INITIAL_ORIGIN_SCALE);
    const maxRadius = Math.hypot(width, height) + PADDING;
    return {
        size,
        scale: (maxRadius + softEdge) / size,
        start: { x: origin.x - size / 2, y: origin.y - size / 2 },
        end: { x: (width - size) / 2, y: (height - size) / 2 },
    };
}

type Geometry = ReturnType<typeof rippleGeometry>;

/** A drawn ripple. `release` fades it after `delay` ms and removes it. */
type RippleHandle = { release: (delay: number) => void };

type Renderer = (
    layer: HTMLElement,
    geometry: Geometry,
    timing: RippleTiming,
    options: RippleOptions,
) => RippleHandle;

const inkWell: Renderer = (
    layer,
    { size, scale, start, end },
    timing,
    options,
) => {
    const element = options.createElement?.() ?? document.createElement("span");
    element.dataset.ripple = "";
    if (options.class) element.classList.add(...normalizeClass(options.class));
    if (options.color) element.style.backgroundColor = options.color;
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    layer.appendChild(element);

    element.animate(
        [
            { transform: `translate(${start.x}px, ${start.y}px) scale(1)` },
            {
                transform: `translate(${end.x}px, ${end.y}px) scale(${scale})`,
            },
        ],
        { duration: timing.grow, easing: timing.easing, fill: "forwards" },
    );

    return {
        release(delay) {
            const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: timing.fade,
                delay,
                easing: "linear",
                fill: "forwards",
            });
            fade.finished.then(
                () => element.remove(),
                () => element.remove(),
            );
        },
    };
};

// The standard easing's deceleration, close enough for a per-frame canvas progress.
const decelerate = (t: number) => 1 - (1 - t) ** 3;

// Sparkles ride an expanding ring, are scattered around it by a fraction of its radius, and
// leave a short trail of fading earlier frames. The defaults keep them faint, as Material does.
const SPARKLE_RING = 0.77;
const SPARKLE_SCATTER = 1 / 6;
const SPARKLE_MAX = 2048;
const SPARKLE_TRAIL = [1, 0.5, 0.2];

const inkSparkle: Renderer = (
    layer,
    { size, scale, start, end },
    timing,
    options,
) => {
    const {
        fillOpacity = 0.1,
        sparkleOpacity = 0.3,
        density = 0.2,
    } = options.sparkle ?? {};
    const { width, height } = layer.getBoundingClientRect();
    const dpr = globalThis.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    canvas.dataset.ripple = "";
    if (options.class) canvas.classList.add(...normalizeClass(options.class));
    // The class may paint the ink-well gradient; the canvas draws its own.
    canvas.style.backgroundImage = "none";
    canvas.style.borderRadius = "0";
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    layer.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return { release: () => canvas.remove() };
    ctx.scale(dpr, dpr);
    const color = options.color ?? getComputedStyle(layer).color;

    const startCenter = { x: start.x + size / 2, y: start.y + size / 2 };
    const endCenter = { x: end.x + size / 2, y: end.y + size / 2 };
    const startRadius = size / 2;
    const endRadius = (size * scale) / 2;
    // From the center, the ring has to reach the far corners to sweep the whole surface.
    const ringReach = Math.hypot(width, height) / 2 / SPARKLE_RING;

    // One preallocated buffer per trail frame, reused round-robin so drawing allocates
    // nothing per frame.
    const trail = SPARKLE_TRAIL.map(() => ({
        xs: new Float32Array(SPARKLE_MAX),
        ys: new Float32Array(SPARKLE_MAX),
        count: 0,
        alpha: 0,
    }));
    let head = 0;

    const began = performance.now();
    let fadeFrom: number | undefined;
    let frame = 0;

    const draw = (now: number) => {
        const p = decelerate(Math.min((now - began) / timing.grow, 1));
        const cx = startCenter.x + (endCenter.x - startCenter.x) * p;
        const cy = startCenter.y + (endCenter.y - startCenter.y) * p;
        const radius = startRadius + (endRadius - startRadius) * p;
        const fade =
            fadeFrom === undefined
                ? 1
                : 1 - Math.min(Math.max((now - fadeFrom) / timing.fade, 0), 1);

        ctx.clearRect(0, 0, width, height);

        // The fill: solid inside, softening toward the edge like the ink well.
        const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        fill.addColorStop(0, color);
        fill.addColorStop(Math.max(1 - 70 / radius, 0.65), color);
        fill.addColorStop(1, "transparent");
        ctx.globalAlpha = fillOpacity * fade;
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, width, height);

        // A fresh set of sparkles each frame, so they shimmer rather than sit still. They thin
        // out as the ripple reaches full size, so a held press settles into the plain fill.
        // The ring grows at a steady pace to just cover the surface, so a small control sees
        // the whole sweep instead of a ring that leaves it within a few frames.
        const t = Math.min((now - began) / timing.grow, 1);
        const ring = Math.max(ringReach * t, startRadius) * SPARKLE_RING;
        const scatter = ring * SPARKLE_SCATTER;
        const current = trail[head];
        if (current) {
            current.count =
                t < 1
                    ? Math.min(
                          Math.round(2 * Math.PI * ring * density),
                          SPARKLE_MAX,
                      )
                    : 0;
            for (let i = 0; i < current.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = ring + (Math.random() - Math.random()) * scatter;
                current.xs[i] = cx + Math.cos(angle) * r;
                current.ys[i] = cy + Math.sin(angle) * r;
            }
            const noise = (Math.random() - Math.random()) * 0.15;
            current.alpha = Math.min(Math.max(1 - t + noise, 0), 1);
        }

        ctx.fillStyle = color;
        for (let age = 0; age < trail.length; age++) {
            const set = trail[(head - age + trail.length) % trail.length];
            const alpha =
                (set?.alpha ?? 0) *
                (SPARKLE_TRAIL[age] ?? 0) *
                sparkleOpacity *
                fade;
            if (!set || alpha <= 0.01) continue;
            ctx.globalAlpha = alpha;
            for (let i = 0; i < set.count; i++) {
                ctx.fillRect(set.xs[i] ?? 0, set.ys[i] ?? 0, 1, 1);
            }
        }
        head = (head + 1) % trail.length;

        if (fade > 0) frame = requestAnimationFrame(draw);
        else canvas.remove();
    };
    frame = requestAnimationFrame(draw);

    return {
        release(delay) {
            if (fadeFrom !== undefined) return;
            fadeFrom = performance.now() + delay;
            // A detached layer stops drawing; make sure the canvas still goes away.
            setTimeout(
                () => {
                    cancelAnimationFrame(frame);
                    canvas.remove();
                },
                delay + timing.fade + 100,
            );
        },
    };
};

const RENDERERS: Record<RippleVariant, Renderer> = {
    "ink-well": inkWell,
    "ink-sparkle": inkSparkle,
};

/** Attach Material press ripples to `container`. Returns a function that detaches them. */
export function ripple(container: HTMLElement, options: RippleOptions = {}) {
    let press:
        | { handle: RippleHandle; startedAt: number; minimum: number }
        | undefined;
    let touchTimer: ReturnType<typeof setTimeout> | undefined;

    const layerOf = () =>
        options.getRippleLayer?.(container) ??
        container.querySelector<HTMLElement>("[data-ripple-layer]");

    function begin(origin: Point | "center") {
        const layer = layerOf();
        if (!layer) return;
        end();

        const rect = layer.getBoundingClientRect();
        const geometry = rippleGeometry(
            rect,
            origin === "center" || options.centerOrigin
                ? { x: rect.width / 2, y: rect.height / 2 }
                : { x: origin.x - rect.left, y: origin.y - rect.top },
        );
        const render = RENDERERS[options.variant ?? "ink-well"];
        const timing = {
            ...readRippleTiming(getComputedStyle(layer)),
            ...options.timing,
        };
        press = {
            handle: render(layer, geometry, timing, options),
            minimum: timing.grow / 2,
            startedAt: performance.now(),
        };
    }

    function end() {
        clearTimeout(touchTimer);
        touchTimer = undefined;
        if (!press) return;
        const { handle, startedAt, minimum } = press;
        press = undefined;
        const held = performance.now() - startedAt;
        handle.release(Math.max(minimum - held, 0));
    }

    function onPointerDown(e: PointerEvent) {
        if (e.button !== 0 || isDisabled(container, options)) return;
        if (!claim(e, options.allowPropagation ?? false)) return;
        const origin = { x: e.clientX, y: e.clientY };
        if (e.pointerType === "touch") {
            // Wait so a scroll that starts here cancels the press (as `pointercancel`) first.
            clearTimeout(touchTimer);
            touchTimer = setTimeout(() => begin(origin), TOUCH_DELAY_MS);
        } else {
            begin(origin);
        }
    }

    function onPointerUp(e: PointerEvent) {
        // A tap released inside the touch delay still gets its full ripple.
        if (touchTimer !== undefined) {
            clearTimeout(touchTimer);
            touchTimer = undefined;
            begin({ x: e.clientX, y: e.clientY });
        }
        end();
    }

    function onCancel() {
        clearTimeout(touchTimer);
        touchTimer = undefined;
        end();
    }

    // A click with no pointer behind it (Enter or Space) ripples from the center.
    function onClick(e: MouseEvent) {
        if (e.detail !== 0 || isDisabled(container, options)) return;
        if (!claim(e, options.allowPropagation ?? false)) return;
        begin("center");
        end();
    }

    const listeners: [string, EventListener][] = [
        ["pointerdown", onPointerDown as EventListener],
        ["pointerup", onPointerUp as EventListener],
        ["pointerleave", onCancel],
        ["pointercancel", onCancel],
        ["click", onClick as EventListener],
    ];
    for (const [type, listener] of listeners) {
        container.addEventListener(type, listener);
    }

    return () => {
        for (const [type, listener] of listeners) {
            container.removeEventListener(type, listener);
        }
        onCancel();
    };
}
