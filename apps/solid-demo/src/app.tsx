import { Box } from "$/jsx";
import type { JsxStyleProps } from "$/types";
import type { ParentProps } from "solid-js";

type ColorDisplayProps = ParentProps<JsxStyleProps>;

function ColorDisplay(props: ColorDisplayProps) {
    return (
        <Box
            {...props}
            textStyle="pf.titleMedium"
            p="4"
            w="60"
            h="24"
            rounded="xl"
            borderColor="pf.outlineVariant"
            borderWidth="thin"
        >
            {props.children}
        </Box>
    );
}

export function App() {
    return (
        <>
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
            </div>
        </>
    );
}
