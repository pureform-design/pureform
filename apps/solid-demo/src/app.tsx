import { cx } from "$/css";
import { Box } from "$/jsx";
import { pfButton, pfStateContainer } from "$/recipes";
import { ColorDisplay } from "./lib";

export function App() {
    const buttonSm = pfButton({
        size: "small",
        color: "info",
    });
    const buttonMd = pfButton({
        size: "medium",
        color: "negative",
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
            base: false,
        },
        focused: {
            _focusVisible: true,
        },
        disabled: {
            _disabled: true,
        },
        pressed: {
            _pressed: true,
            _active: true,
        },
    });

    return (
        <>
            <button class={cx(buttonSm.root, sc.root)} type="button">
                <span class={sc.stateLayer} />
                <span class={buttonSm.label}>Hello</span>
            </button>

            <button class={cx(buttonMd.root, sc.root)} type="button">
                <span class={sc.stateLayer} />
                <span class={buttonMd.label}>Hello</span>
            </button>

            <button class={cx(buttonLg.root, sc.root)} type="button">
                <span class={sc.stateLayer} />
                <span class={buttonLg.label}>Hello</span>
            </button>

            <button class={cx(buttonLg2.root, sc.root)} type="button">
                <span class={sc.stateLayer} />
                <span class={buttonLg2.label}>Hello</span>
            </button>
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
