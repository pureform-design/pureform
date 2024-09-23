import { Box } from "$/jsx";
import { ColorDisplay } from "./lib";

export function App() {
    return (
        <>
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
