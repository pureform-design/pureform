import { cx } from "$/css";
import { Box } from "$/jsx";
import {
    pfButton,
    pfIconButton,
    pfStateContainer,
    pfRippleLayer,
} from "$/recipes";
import { onCleanup } from "solid-js";
import { ColorDisplay } from "./lib";
import { ripple } from "@pureform/js-effects";

export function App() {
    const buttonSm = pfButton({
        size: "small",
        color: "info",
        variant: "outlined",
    });
    const buttonMd = pfButton({
        size: "medium",
        color: "negative",
        variant: "elevated",
    });
    const buttonLg = pfButton({
        size: "large",
        color: "positive",
    });
    const buttonLg2 = pfButton({
        size: "large",
        color: "notice",
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
    });
    const rippleLayer = pfRippleLayer();

    return (
        <>
            <button class={cx(buttonSm.root, sc.root)} type="button">
                <span class={sc.stateLayer} />
                <span class={buttonSm.label}>Hello</span>
                <span class={buttonSm.touchTarget} />
            </button>
            <button class={cx(icon.root, sc.root, "group")} type="button">
                <span class={sc.stateLayer} />X
                <span class={icon.touchTarget} />
            </button>

            <button class={cx(buttonMd.root, sc.root, "group")} type="button">
                <span class={sc.stateLayer} />
                <span class={buttonMd.label}>Hello</span>
                <span class={buttonMd.touchTarget} />
            </button>

            <button class={cx(buttonLg.root, sc.root)} type="button">
                <span class={sc.stateLayer} />
                <span class={buttonLg.label}>Hello</span>
                <span class={buttonLg.touchTarget} />
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
            <Box bg="pf.background" h="[100dvh]">
                <div class="dark">
                    <Box
                        w="400px"
                        h="400px"
                        bg="pf.tertiaryContainer"
                        color="pf.onTertiaryContainer"
                        position="relative"
                        overflow="hidden"
                        ref={(el) => {
                            const dispose = ripple(el, {
                                class: rippleLayer.ripple,
                            });

                            onCleanup(dispose);
                        }}
                    >
                        <span class={rippleLayer.root} data-ripple-layer />
                    </Box>
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
