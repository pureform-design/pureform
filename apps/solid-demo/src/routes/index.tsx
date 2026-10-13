import { button as pureformButton } from "$recipes";
import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/")({
    component: IndexRoute,
});

function IndexRoute() {
    // Button styled entirely from adapter-generated output (the pureform CoreConfig compiled
    // to this Panda preset by @pureform/panda-adapter).
    const button = pureformButton({
        color: "brand",
        variant: "solid",
        size: "lg",
    });

    return (
        <>
            <button class={button.root} type="button">
                <span class={button.label}>Generated button</span>
            </button>
        </>
    );
}
