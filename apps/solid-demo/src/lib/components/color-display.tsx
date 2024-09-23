import { Box } from "$/jsx";
import type { JsxStyleProps } from "$/types";
import type { ParentProps } from "solid-js";

export type ColorDisplayProps = ParentProps<JsxStyleProps>;

export function ColorDisplay(props: ColorDisplayProps) {
    return (
        <Box
            {...props}
            textStyle="titleMedium"
            p="4"
            w="60"
            h="24"
            rounded="xl"
            borderColor="outlineVariant"
            borderWidth="thin"
            pfShadowElevation="level1"
        >
            {props.children}
        </Box>
    );
}
