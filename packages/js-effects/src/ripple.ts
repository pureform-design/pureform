// Material 3 press ripples.
//
// A press grows a ripple from the press point toward the center of the surface and holds it
// while the pointer stays down. Release fades it out, but never before a minimum press time,
// so a quick tap still shows the full ripple. Touch presses wait briefly so a scroll does not
// ripple, and a keyboard click ripples from the center.
//
// Two variants share that press handling and differ only in how a ripple is drawn:
// - `ink-well`: Material's reference ripple, a soft-edged circle animated with CSS transforms.
// - `ink-sparkle`: Material's sparkle ripple (Flutter's `InkSparkle`), drawn on a canvas as a
//   faint fill with a band of twinkling sparkles riding its expanding edge.

const PRESS_GROW_MS = 450;
const MINIMUM_PRESS_MS = 225;
const FADE_MS = 375;
const TOUCH_DELAY_MS = 150;
const INITIAL_ORIGIN_SCALE = 0.2;
const PADDING = 10;
const SOFT_EDGE_MINIMUM_SIZE = 75;
const SOFT_EDGE_CONTAINER_RATIO = 0.35;
const STANDARD_EASING = "cubic-bezier(0.2, 0, 0, 1)";

type CssClasses = { [key: string]: boolean } | string | string[];

export type RippleVariant = "ink-well" | "ink-sparkle";

export type SparkleOptions = {
    /** Opacity of the fill behind the sparkles. Default `0.1`, the pressed state opacity. */
    fillOpacity?: number;
    /** Peak opacity of a sparkle. Default `0.6`. */
    sparkleOpacity?: number;
    /** Sparkles per 100 square pixels of surface. Default `1.2`. */
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
    options: RippleOptions,
) => RippleHandle;

const inkWell: Renderer = (layer, { size, scale, start, end }, options) => {
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
        { duration: PRESS_GROW_MS, easing: STANDARD_EASING, fill: "forwards" },
    );

    return {
        release(delay) {
            const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: FADE_MS,
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

const SPARKLE_BAND = 0.35;

const inkSparkle: Renderer = (layer, { size, scale, start, end }, options) => {
    const {
        fillOpacity = 0.1,
        sparkleOpacity = 0.6,
        density = 1.2,
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

    const sparkles = Array.from(
        { length: Math.round((width * height * density) / 100) },
        () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 0.5 + Math.random() * 0.8,
            phase: Math.random() * Math.PI * 2,
            speed: 0.01 + Math.random() * 0.02,
        }),
    );

    const startCenter = { x: start.x + size / 2, y: start.y + size / 2 };
    const endCenter = { x: end.x + size / 2, y: end.y + size / 2 };
    const startRadius = size / 2;
    const endRadius = (size * scale) / 2;

    const began = performance.now();
    let fadeFrom: number | undefined;
    let frame = 0;

    const draw = (now: number) => {
        const elapsed = now - began;
        const p = decelerate(Math.min(elapsed / PRESS_GROW_MS, 1));
        const cx = startCenter.x + (endCenter.x - startCenter.x) * p;
        const cy = startCenter.y + (endCenter.y - startCenter.y) * p;
        const radius = startRadius + (endRadius - startRadius) * p;
        const fade =
            fadeFrom === undefined
                ? 1
                : 1 - Math.min(Math.max((now - fadeFrom) / FADE_MS, 0), 1);

        ctx.clearRect(0, 0, width, height);

        // The fill: solid inside, softening toward the edge like the ink well.
        const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        fill.addColorStop(0, color);
        fill.addColorStop(Math.max(1 - 70 / radius, 0.65), color);
        fill.addColorStop(1, "transparent");
        ctx.globalAlpha = fillOpacity * fade;
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, width, height);

        // The sparkles: brightest on the expanding edge, dimmer behind it, twinkling.
        ctx.fillStyle = color;
        const band = radius * SPARKLE_BAND;
        for (const s of sparkles) {
            const d = Math.hypot(s.x - cx, s.y - cy);
            if (d > radius) continue;
            const edge = 1 - Math.min((radius - d) / band, 1);
            const twinkle = 0.5 + 0.5 * Math.sin(s.phase + elapsed * s.speed);
            const alpha =
                sparkleOpacity * (0.25 + 0.75 * edge) * twinkle * fade;
            if (alpha <= 0.01) continue;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

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
                delay + FADE_MS + 100,
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
    let press: { handle: RippleHandle; startedAt: number } | undefined;
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
        press = {
            handle: render(layer, geometry, options),
            startedAt: performance.now(),
        };
    }

    function end() {
        clearTimeout(touchTimer);
        touchTimer = undefined;
        if (!press) return;
        const { handle, startedAt } = press;
        press = undefined;
        const held = performance.now() - startedAt;
        handle.release(Math.max(MINIMUM_PRESS_MS - held, 0));
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
