import { ripple as rippleRecipe } from "$recipes";
import { ripple } from "@pureform/js-effects";
import { onSettled } from "solid-js";

// Render inside any positioned interactive surface. The layer listens for presses on its parent
// and draws a ripple from the press point; the surface's text color tints it.
export function Ripple(props: { centered?: boolean }) {
    let layer: HTMLSpanElement | undefined;
    const classes = rippleRecipe();

    onSettled(() => {
        const surface = layer?.parentElement;
        if (!surface) return;
        return ripple(surface, {
            class: classes.ripple ?? "",
            centerOrigin: props.centered ?? false,
        });
    });

    return (
        <span
            ref={(el) => (layer = el)}
            class={classes.root}
            data-ripple-layer
        />
    );
}
