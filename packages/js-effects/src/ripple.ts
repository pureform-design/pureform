// Material 3 press ripple.
//
// A press grows a ripple from the press point toward the center of the surface and holds it
// while the pointer stays down. Release fades it out, but never before a minimum press time,
// so a quick tap still shows the full ripple. Touch presses wait briefly so a scroll does not
// ripple, and a keyboard click ripples from the center. The timings and sizes follow
// Material's reference ripple.

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

export type RippleOptions = {
    /** Classes for each ripple element, usually the preset's ripple slot class. */
    class?: CssClasses;
    /** A background color for each ripple. Leave unset to let the class style it. */
    color?: string;
    /** Element to use for each ripple. Default: a new `span`. */
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

/** Geometry of one ripple in a layer of the given size, pressed at `origin`. */
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

/** Attach Material press ripples to `container`. Returns a function that detaches them. */
export function ripple(container: HTMLElement, options: RippleOptions = {}) {
    let press: { element: HTMLElement; startedAt: number } | undefined;
    let touchTimer: ReturnType<typeof setTimeout> | undefined;

    const layerOf = () =>
        options.getRippleLayer?.(container) ??
        container.querySelector<HTMLElement>("[data-ripple-layer]");

    function begin(origin: Point | "center") {
        const layer = layerOf();
        if (!layer) return;
        end();

        const rect = layer.getBoundingClientRect();
        const {
            size,
            scale,
            start,
            end: target,
        } = rippleGeometry(
            rect,
            origin === "center" || options.centerOrigin
                ? { x: rect.width / 2, y: rect.height / 2 }
                : { x: origin.x - rect.left, y: origin.y - rect.top },
        );

        const element =
            options.createElement?.() ?? document.createElement("span");
        element.dataset.ripple = "";
        if (options.class)
            element.classList.add(...normalizeClass(options.class));
        if (options.color) element.style.backgroundColor = options.color;
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        layer.appendChild(element);

        element.animate(
            [
                { transform: `translate(${start.x}px, ${start.y}px) scale(1)` },
                {
                    transform: `translate(${target.x}px, ${target.y}px) scale(${scale})`,
                },
            ],
            {
                duration: PRESS_GROW_MS,
                easing: STANDARD_EASING,
                fill: "forwards",
            },
        );
        press = { element, startedAt: performance.now() };
    }

    function end() {
        clearTimeout(touchTimer);
        touchTimer = undefined;
        if (!press) return;
        const { element, startedAt } = press;
        press = undefined;
        const held = performance.now() - startedAt;
        const fade = element.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: FADE_MS,
            delay: Math.max(MINIMUM_PRESS_MS - held, 0),
            easing: "linear",
            fill: "forwards",
        });
        fade.finished.then(
            () => element.remove(),
            () => element.remove(),
        );
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
