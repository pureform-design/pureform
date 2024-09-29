let RIPPLE_TEMPLATE: HTMLElement;

function getRipplePrototype() {
    if (!RIPPLE_TEMPLATE) {
        RIPPLE_TEMPLATE = document.createElement("span");
    }

    return RIPPLE_TEMPLATE.cloneNode(true) as HTMLElement;
}

type CssClasses =
    | {
          [key: string]: boolean;
      }
    | string
    | string[];

export type CreateRippleOptions = {
    diameter: number;
    relativeOrigin: { x: number; y: number };
    color?: string;
    /**
     * Use this to provide a custom prototype element for the ripple. The default prototype is a span.
     */
    getPrototype?: () => HTMLElement;
    /**
     * Use this to provide custom classes for the ripple. The classes will be applied to the prototype element.
     */
    class?: CssClasses;
    /**
     * Use this to apply values to the prototype element. The default is "style".
     *
     * @enum
     * - "dataset" will apply the values to the dataset.
     * - "cssVar" will apply the values to css variables.
     * - "style" will apply the values to the style attribute.
     * - "all" will apply the values to both the dataset, css variables, and the style.
     * - "none" will not apply any values.
     *
     */
    applyValuesTo?: "dataset" | "cssVar" | "all" | "none" | "style";
    cssVars?: {
        diameter?: string;
        originX?: string;
        originY?: string;
    };
    datasetKeys?: {
        diameter?: string;
        originX?: string;
        originY?: string;
    };
};

function normalizeClass(cls: CssClasses): string {
    if (typeof cls === "string") {
        return cls;
    }

    if (Array.isArray(cls)) {
        return cls.join(" ");
    }

    return Object.keys(cls)
        .filter((key) => cls[key])
        .join(" ");
}

export function createRipple(opts: CreateRippleOptions) {
    const ripple = opts.getPrototype?.() ?? getRipplePrototype();
    ripple.dataset.ripple = "";
    const diameter = `${opts.diameter}px`;
    const originX = `${opts.relativeOrigin.x}px`;
    const originY = `${opts.relativeOrigin.y}px`;

    const applyTo = opts.applyValuesTo ?? "style";

    if (applyTo === "cssVar" || applyTo === "all") {
        ripple.style.setProperty(
            opts?.cssVars?.diameter ?? "--diameter",
            diameter,
        );
        ripple.style.setProperty(
            opts?.cssVars?.originX ?? "--origin-x",
            originX,
        );
        ripple.style.setProperty(
            opts?.cssVars?.originY ?? "--origin-y",
            originY,
        );
    }

    if (applyTo === "dataset" || applyTo === "all") {
        ripple.dataset[opts?.datasetKeys?.diameter ?? "diameter"] = diameter;
        ripple.dataset[opts?.datasetKeys?.originX ?? "originX"] = originX;
        ripple.dataset[opts?.datasetKeys?.originY ?? "originY"] = originY;
    }

    if (applyTo === "style" || applyTo === "all") {
        ripple.style.width = diameter;
        ripple.style.height = diameter;
        ripple.style.top = `calc(${originY} - (${diameter} / 2))`;
        ripple.style.left = `calc(${originX} - (${diameter} / 2))`;
        ripple.style.filter = `blur(${(Number.parseInt(diameter) * 0.05) / 2}px)`;
    }

    if (opts.color) {
        ripple.style.backgroundColor = opts.color;
    }
    const cls = opts.class;
    if (cls) {
        const classes = normalizeClass(cls).split(" ");

        ripple.classList.add(...classes);
    }

    return ripple;
}

function getRippleDiameter(rect: DOMRect) {
    return Math.max(rect.width, rect.height) * 3;
}

function getRelativeMousePosition(
    container: DOMRect,
    e: MouseEvent,
): { x: number; y: number } {
    const x = e.clientX;
    const y = e.clientY;
    const originX = x - container.left;
    const originY = y - container.top;

    return { x: originX, y: originY };
}

function getCenteredOrigin(container: DOMRect) {
    return {
        x: container.width / 2,
        y: container.height / 2,
    };
}

type MaterialRippleEvent = {
    __customRippleMetaData: {
        rippled: boolean;
        allowPropagation: boolean;
    };
} & Event;

function markAsRippled(e: Event, allowPropagation = false) {
    const ev = e as unknown as MaterialRippleEvent;

    if (ev.__customRippleMetaData) {
        ev.__customRippleMetaData.rippled = true;
        ev.__customRippleMetaData.allowPropagation = allowPropagation;
    } else {
        ev.__customRippleMetaData = {
            rippled: true,
            allowPropagation,
        };
    }
}

function shouldRipple(e: Event) {
    const meta = (e as unknown as MaterialRippleEvent)
        .__customRippleMetaData ?? {
        rippled: false,
        allowPropagation: false,
    };

    return !meta.rippled || meta.allowPropagation;
}

function getRippleLayer(rippleContainer: HTMLElement) {
    return rippleContainer.querySelector(
        "[data-ripple-layer]",
    ) as HTMLElement | null;
}

function getExistingRipples(rippleLayer: HTMLElement) {
    return Array.from(rippleLayer.querySelectorAll("[data-ripple]"));
}

export type RippleOptions = Omit<
    CreateRippleOptions,
    "relativeOrigin" | "diameter"
> & {
    color?: string;
    removeExistingRipples?: boolean;
    getExistingRipples?: (rippleLayer: HTMLElement) => HTMLElement[];
    allowPropagation?: boolean;
    getRippleLayer?: (rippleContainer: HTMLElement) => HTMLElement;
    animate?: boolean | ((ripple: HTMLElement, disponse: () => void) => void);
    disposeOnEvents?: boolean | string[];
    centerOrigin?: boolean;
};

function animateRipple(
    ripple: HTMLElement,
    duration: number,
    dispose: () => void,
) {
    const animation = ripple.animate(
        [
            { transform: "scale(0)", opacity: 0 },
            { opacity: 1, offset: 0.7 },
            { opacity: 1, offset: 0.8 },
            { transform: "scale(1)", opacity: 0, offset: 1 },
        ],
        {
            duration,
            easing: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
        },
    );

    animation.finished.then(() => {
        animation.commitStyles();
        dispose();
    });
}

export function ripple(rippleContainer: HTMLElement, options?: RippleOptions) {
    function handleClick(e: MouseEvent) {
        const rippleLayer =
            options?.getRippleLayer?.(rippleContainer) ??
            getRippleLayer(rippleContainer);
        if (!rippleLayer) {
            return;
        }
        if (!shouldRipple(e)) {
            return;
        }

        markAsRippled(e, options?.allowPropagation);

        const color = options?.color
            ? {
                  color: "currentColor",
              }
            : {};

        if (options?.removeExistingRipples ?? true) {
            const existing =
                options?.getExistingRipples?.(rippleLayer) ??
                getExistingRipples(rippleLayer);

            for (const ripple of existing) {
                ripple.remove();
            }
        }

        requestAnimationFrame(() => {
            const rippleLayerRect = rippleLayer.getBoundingClientRect();
            const diameter = getRippleDiameter(rippleLayerRect);
            const { x: originX, y: originY } = options?.centerOrigin
                ? getCenteredOrigin(rippleLayerRect)
                : getRelativeMousePosition(rippleLayerRect, e);

            const ripple = createRipple({
                ...options,
                ...color,
                relativeOrigin: {
                    x: originX,
                    y: originY,
                },
                diameter: diameter,
            });

            rippleLayer.appendChild(ripple);

            const dispose = () => {
                ripple.remove();
            };

            const animate = options?.animate ?? true;
            if (animate) {
                if (typeof animate === "function") {
                    animate(ripple, dispose);
                } else {
                    animateRipple(ripple, getDuration(diameter), dispose);
                }
            }

            if (options?.disposeOnEvents) {
                const events = Array.isArray(options.disposeOnEvents)
                    ? options.disposeOnEvents
                    : ["animationend", "animationcancel"];
                for (const event of events) {
                    ripple.addEventListener(event, dispose);
                }
            }
        });
    }

    rippleContainer.addEventListener("pointerdown", handleClick);

    return () => {
        rippleContainer.removeEventListener("pointerdown", handleClick);
    };
}

function getDuration(diameter: number) {
    return 2000 + diameter * 0.5;
}
