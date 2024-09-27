import { Box, splitCssProps } from "$/jsx";
import type { JsxStyleProps } from "$/types";
import type { ParentProps } from "solid-js";

export type ColorDisplayProps = ParentProps<JsxStyleProps>;

export function ColorDisplay(props: ColorDisplayProps) {
    const [cssProps] = splitCssProps(props);

    return (
        <Box
            {...cssProps}
            textStyle="pf.titleSmall"
            p="4"
            w="60"
            h="24"
            rounded="xl"
            borderColor="pf.outlineVariant"
            borderWidth="thin"
            pfShadowElevation="level1"
        >
            {props.children}
        </Box>
    );
}
