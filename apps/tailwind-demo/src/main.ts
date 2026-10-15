// pureform's components and tokens in Tailwind: the layout and page colors are utilities over
// pureform's tokens, and a utility overrides a component's own style.

import "./app.css";
import {
    button,
    card,
    checkbox,
    iconButton,
    media,
    text,
    textField,
} from "virtual:pureform/recipes";

type Child = Node | string;

const h = (
    tag: string,
    attributes: Record<string, string> = {},
    ...children: Child[]
): HTMLElement => {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
    }
    element.append(...children);
    return element;
};

const row = (...children: Child[]) =>
    h("div", { class: "flex flex-wrap items-center gap-3" }, ...children);

const section = (title: string, ...children: Child[]) =>
    h(
        "section",
        { class: "grid gap-3" },
        h(
            "h2",
            { class: "text-title-large font-plain text-on-surface-variant" },
            title,
        ),
        ...children,
    );

const labelled = (classes: { root: string; label: string }, label: string) =>
    h(
        "button",
        { class: classes.root, type: "button" },
        h("span", { class: classes.label }, label),
    );

const PICTURE = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#7aa6c2"/><circle cx="90" cy="18" r="10" fill="#f4d35e"/><path d="M0 60 40 22l30 30 20-14 30 22z" fill="#386641"/></svg>',
)}`;

const buttons = row(
    ...(["filled", "tonal", "outlined", "text", "elevated"] as const).map(
        (variant) => labelled(button({ variant }), variant),
    ),
);

// Utilities sit in a later layer than components, so they win without !important.
const overridden = row(
    labelled(
        { ...button(), root: `${button().root} rounded-none` },
        "rounded-none",
    ),
    labelled(
        {
            ...button({ variant: "outlined" }),
            root: `${button({ variant: "outlined" }).root} px-10`,
        },
        "px-10",
    ),
    ...(["cookie9Sided", "sunny"] as const).map((shape) => {
        const b = iconButton({ variant: "filled", shape });
        return h(
            "button",
            { class: b.root, type: "button", "aria-label": shape },
            h("span", { class: b.touchTarget }),
            h("span", { class: b.container }, "★"),
        );
    }),
);

const field = () => {
    const t = textField({ variant: "outlined" });
    return h(
        "div",
        { class: `${t.root} w-60` },
        h(
            "div",
            { class: t.container },
            h("input", { class: t.input, id: "field", placeholder: " " }),
            h("label", { class: t.label, for: "field" }, "outlined field"),
        ),
        h("span", { class: t.supportingText }, "Supporting text"),
    );
};

const box = checkbox();
const checked = h(
    "label",
    { class: box.root, title: "checkbox" },
    h("span", { class: box.touchTarget }),
    h("input", { class: box.input, type: "checkbox", checked: "" }),
    h(
        "span",
        { class: box.box },
        h("span", { class: box.checkIcon }),
        h("span", { class: box.indeterminateIcon }),
    ),
);

const artwork = h(
    "article",
    { class: `${card({ variant: "filled" }).root} grid w-60 gap-3 p-4` },
    h("img", { class: media({ aspect: "landscape" }), src: PICTURE, alt: "" }),
    h("h3", { class: text({ style: "titleMedium" }) }, "Hills at dusk"),
    h(
        "p",
        { class: "text-body-medium text-on-surface-variant" },
        "A filled card, padded with Tailwind.",
    ),
);

// Theme variants from the adapter: `dark:` and `theme-teal:` follow the same scopes as the
// components' own tokens.
const badge = h(
    "span",
    {
        class: "rounded-full bg-primary-container px-3 py-1 text-label-large text-on-primary-container dark:outline-2 dark:outline-primary theme-teal:rounded-small",
    },
    "badge",
);

const app = document.getElementById("app")!;
const toggles = row(
    ...(["light", "dark"] as const).map((scheme) =>
        h(
            "button",
            {
                class: button({ variant: "outlined" }).root,
                type: "button",
                "data-scheme": scheme,
            },
            h("span", { class: button().label }, scheme),
        ),
    ),
    ...(["base", "teal"] as const).map((theme) =>
        h(
            "button",
            {
                class: button({ variant: "outlined" }).root,
                type: "button",
                "data-pick-theme": theme,
            },
            h("span", { class: button().label }, `${theme} theme`),
        ),
    ),
);
toggles.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest("button");
    const scheme = target?.dataset.scheme;
    if (scheme) {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(scheme);
    }
    const theme = target?.dataset.pickTheme;
    if (theme === "base") app.removeAttribute("data-theme");
    else if (theme) app.setAttribute("data-theme", theme);
});

app.className = "grid min-h-dvh gap-8 bg-surface p-8 text-on-surface";
app.append(
    h("h1", { class: "text-headline-medium" }, "pureform, Tailwind"),
    toggles,
    section("Buttons", buttons),
    section("Overridden by utilities", overridden),
    section("Fields and controls", row(field(), checked)),
    section("Card and tokens", row(artwork, badge)),
);
