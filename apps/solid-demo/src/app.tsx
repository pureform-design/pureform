import { cx } from "$/css";
import { Box } from "$/jsx";
import {
    pfButton,
    pfCard,
    pfIconButton,
    pfRippleLayer,
    pfStateContainer,
} from "$/recipes";
import { ripple } from "@pureform/js-effects";
import { onCleanup } from "solid-js";
import { ColorDisplay } from "./lib";

export function App() {
    const buttonSm = pfButton({
        size: "small",
        color: "info",
        variant: "outlined",
        disabled: true,
    });
    const buttonMd = pfButton({
        size: "medium",
        color: "negative",
        variant: "elevated",
        disabled: true,
    });
    const buttonLg = pfButton({
        size: "large",
        color: "positive",
        disabled: true,
    });
    const buttonLg2 = pfButton({
        size: "large",
        color: "notice",
        disabled: true,
    });
    const sc = pfStateContainer({
        hovered: {
            _hover: true,
            _groupHover: true,
            base: false,
        },
        focused: {
            _focusVisible: true,
            _groupFocusVisible: true,
        },
        disabled: {
            _disabled: true,
            _groupDisabled: true,
        },
        pressed: {
            _pressed: true,
            _groupActive: true,
            _active: true,
        },
    });
    const icon = pfIconButton({
        color: "negative",
        variant: "outlined",
        disabled: true,
    });
    const rippleLayer = pfRippleLayer();
    const card = pfCard({
        variant: "elevated",
    });

    return (
        <>
            <button
                class={cx(buttonSm.root, sc.root)}
                type="button"
                ref={(el) => {
                    const dispose = ripple(el, {
                        class: rippleLayer.ripple,
                    });

                    onCleanup(dispose);
                }}
            >
                <span class={sc.stateLayer} />
                <span class={buttonSm.label}>Hello</span>
                <span class={rippleLayer.root} data-ripple-layer />
                <span class={buttonSm.touchTarget} />
            </button>
            <button
                class={cx(icon.root, sc.root, "group")}
                type="button"
                ref={(el) => {
                    const dispose = ripple(el, {
                        class: rippleLayer.ripple,
                    });

                    onCleanup(dispose);
                }}
            >
                <span class={sc.stateLayer} />X
                <span class={icon.touchTarget} />
                <span class={rippleLayer.root} data-ripple-layer />
            </button>

            <button
                class={cx(buttonMd.root, sc.root, "group")}
                type="button"
                ref={(el) => {
                    const dispose = ripple(el, {
                        class: rippleLayer.ripple,
                    });

                    onCleanup(dispose);
                }}
            >
                <span class={sc.stateLayer} />
                <span class={buttonMd.label}>Hello</span>
                <span class={buttonMd.touchTarget} />
                <span class={rippleLayer.root} data-ripple-layer />
            </button>

            <button
                class={cx(buttonLg.root, sc.root)}
                type="button"
                ref={(el) => {
                    const dispose = ripple(el, {
                        class: rippleLayer.ripple,
                    });

                    onCleanup(dispose);
                }}
            >
                <span class={sc.stateLayer} />
                <span class={buttonLg.label}>Hello</span>
                <span class={buttonLg.touchTarget} />
                <span class={rippleLayer.root} data-ripple-layer />
            </button>

            <button
                class={cx(buttonLg2.root, sc.root)}
                type="button"
                ref={(el) => {
                    const dispose = ripple(el, {
                        class: rippleLayer.ripple,
                    });

                    onCleanup(dispose);
                }}
            >
                <span class={sc.stateLayer} />
                <span class={buttonLg2.label}>Hello</span>
                <span class={buttonLg2.touchTarget} />
                <span class={rippleLayer.root} data-ripple-layer />
            </button>
            <Box
                w="400px"
                h="400px"
                position="relative"
                overflow="hidden"
                class={card.root}
                ref={(el) => {
                    const dispose = ripple(el, {
                        class: rippleLayer.ripple,
                    });

                    onCleanup(dispose);
                }}
                textStyle="pf.titleLarge"
            >
                <span class={rippleLayer.root} data-ripple-layer />
                Hello
            </Box>
            <Box bg="pf.background" h="[100dvh]">
                <div class="dark">
                    <ColorDisplay
                        bg="pf.primaryContainer"
                        color="pf.onPrimaryContainer"
                    >
                        Primary
                    </ColorDisplay>
                    <ColorDisplay
                        bg="pf.neutralVariant"
                        color="pf.onNeutralVariant"
                    >
                        Neutral Variant
                    </ColorDisplay>
                </div>
                <div>
                    <ColorDisplay
                        bg="pf.primaryContainer"
                        color="pf.onPrimaryContainer"
                    >
                        Primary
                    </ColorDisplay>
                    <ColorDisplay
                        bg="pf.neutralVariant"
                        color="pf.onNeutralVariant"
                    >
                        Neutral Variant
                    </ColorDisplay>
                    <ColorDisplay
                        pfSurfaceElevation="level5"
                        color="pf.onSurface"
                    >
                        Surface Elevation Level 5
                    </ColorDisplay>
                    <ColorDisplay
                        pfSurfaceElevation="level4"
                        color="pf.onSurface"
                    >
                        Surface Elevation Level 4
                    </ColorDisplay>
                    <ColorDisplay
                        pfSurfaceElevation="level3"
                        color="pf.onSurface"
                    >
                        Surface Elevation Level 3
                    </ColorDisplay>
                    <ColorDisplay
                        pfSurfaceElevation="level2"
                        color="pf.onSurface"
                    >
                        Surface Elevation Level 2
                    </ColorDisplay>
                    <ColorDisplay
                        pfSurfaceElevation="level1"
                        color="pf.onSurface"
                    >
                        Surface Elevation Level 1
                    </ColorDisplay>
                    <ColorDisplay
                        pfSurfaceElevation="level0"
                        color="pf.onSurface"
                    >
                        Surface Elevation Level 0
                    </ColorDisplay>
                </div>
            </Box>
        </>
    );
}
