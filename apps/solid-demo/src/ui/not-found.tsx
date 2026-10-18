// The page for a URL no route matches, inside the shell like any other page.

import { css } from "$css";
import { Button } from "@pureform/solid/button";
import { Text } from "@pureform/solid/text";
import type { JSX } from "@solidjs/web";
import { useNavigate } from "@tanstack/solid-router";

const page = css({
    minHeight: "100dvh",
    display: "grid",
    placeContent: "center",
    justifyItems: "center",
    gap: "4",
    padding: "6",
    textAlign: "center",
});

export function NotFound(): JSX.Element {
    const navigate = useNavigate();
    return (
        <main class={page}>
            <Text as="h1" textStyle="headlineMedium">
                Page not found
            </Text>
            <Text textStyle="bodyLarge">Nothing lives at this address.</Text>
            <Button
                variant="tonal"
                onClick={() => void navigate({ to: "/" })}
                label="Back to the apps"
            />
        </main>
    );
}
