import { css } from "$css";
import { Avatar } from "@pureform/solid/avatar";
import { Card } from "@pureform/solid/card";
import { List } from "@pureform/solid/list";
import { Separator } from "@pureform/solid/separator";
import { Text } from "@pureform/solid/text";
import { createFileRoute } from "@tanstack/solid-router";

import { APPS } from "../apps";
import { Glyph } from "../ui/icons";

export const Route = createFileRoute("/")({
    head: () => ({ meta: [{ title: "pureform demos" }] }),
    component: Launcher,
});

// The launcher: one panel in the middle of the page, listing every app in `src/apps.ts`.

const page = css({
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    paddingInline: "4",
    paddingBlock: "16",
});

const panel = css({
    width: "100%",
    maxWidth: "calc(token(spacing.16) * 9)",
    display: "grid",
    gap: "4",
    paddingBlock: "6",
    paddingInline: "0",
});

const inset = css({ display: "grid", gap: "2", paddingInline: "6" });

function Launcher() {
    const apps = APPS.map((app) => ({
        value: app.href,
        headline: app.name,
        supportingText: app.description,
        leading: (
            <Avatar color={app.color}>
                <Glyph name={app.icon} />
            </Avatar>
        ),
        trailing: <Glyph name="chevronEnd" />,
        mirrorTrailing: true,
        href: app.href,
    }));
    return (
        <main class={page}>
            <Card
                variant="elevated"
                class={{ root: panel }}
                data-testid="launcher"
            >
                <header class={inset}>
                    <Text as="h1" textStyle="headlineMedium">
                        pureform demos
                    </Text>
                    <Text textStyle="bodyMedium">
                        Small apps built from <code>@pureform/solid</code>'s
                        Material components, rendered on the server and
                        hydrated.
                    </Text>
                </header>
                <nav aria-label="Apps">
                    <List items={apps} tokens={{ container: "transparent" }} />
                </nav>
                <Separator />
                <Text textStyle="bodySmall" class={inset}>
                    The button in the corner changes the color scheme, theme,
                    shape, density, font, direction, motion, and indication of
                    every app, and switches between them.
                </Text>
            </Card>
        </main>
    );
}
