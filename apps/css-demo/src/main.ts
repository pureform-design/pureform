// pureform with no framework and no Panda: the CSS adapter's stylesheet, its reset, and class
// names from the generated components module.

import "@pureform/css-adapter/reset.css";
import "virtual:pureform.css";
import {
    avatar,
    button,
    card,
    checkbox,
    fab,
    iconButton,
    media,
    switchControl,
    text,
    textField,
} from "virtual:pureform/components";

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
    h(
        "div",
        {
            style: "display: flex; flex-wrap: wrap; gap: 12px; align-items: center",
        },
        ...children,
    );

const section = (title: string, ...children: Child[]) =>
    h(
        "section",
        { style: "display: grid; gap: 12px" },
        h("h2", { class: text({ style: "titleLarge" }) }, title),
        ...children,
    );

const PICTURE = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#7aa6c2"/><circle cx="90" cy="18" r="10" fill="#f4d35e"/><path d="M0 60 40 22l30 30 20-14 30 22z" fill="#386641"/></svg>',
)}`;

const buttons = row(
    ...(["filled", "tonal", "outlined", "text", "elevated"] as const).map(
        (variant) => {
            const b = button({ variant });
            return h(
                "button",
                { class: b.root, type: "button" },
                h("span", { class: b.touchTarget }),
                h("span", { class: b.label }, variant),
            );
        },
    ),
);

const shaped = row(
    ...(["none", "cookie9Sided", "clover4Leaf", "sunny"] as const).map(
        (shape) => {
            const b = iconButton({ variant: "filled", shape });
            return h(
                "button",
                { class: b.root, type: "button", "aria-label": shape },
                h("span", { class: b.touchTarget }),
                h("span", { class: b.container }, "★"),
            );
        },
    ),
    ...(["arch", "pill"] as const).map((shape) => {
        const f = fab({ shape });
        return h(
            "button",
            { class: f.root, type: "button", "aria-label": `${shape} FAB` },
            h("span", { class: f.touchTarget }),
            h(
                "span",
                { class: f.container },
                h("span", { class: f.icon }, "+"),
            ),
        );
    }),
    ...(["small", "medium", "large"] as const).map((size) =>
        h(
            "span",
            {
                class: avatar({ size, shape: "cookie9Sided" }),
                role: "img",
                "aria-label": "Ada Lovelace",
            },
            "AL",
        ),
    ),
);

const field = (variant: "filled" | "outlined") => {
    const t = textField({ variant });
    const id = `field-${variant}`;
    return h(
        "div",
        { class: t.root, style: "width: 240px" },
        h(
            "div",
            { class: t.container },
            h("input", { class: t.input, id, placeholder: " " }),
            h("label", { class: t.label, for: id }, `${variant} field`),
        ),
        h("span", { class: t.supportingText }, "Supporting text"),
    );
};

const controls = () => {
    const c = checkbox();
    const s = switchControl();
    return row(
        h(
            "label",
            { class: c.root, title: "checkbox" },
            h("span", { class: c.touchTarget }),
            h("input", { class: c.input, type: "checkbox", checked: "" }),
            h(
                "span",
                { class: c.box },
                h("span", { class: c.checkIcon }),
                h("span", { class: c.indeterminateIcon }),
            ),
        ),
        h(
            "label",
            { class: s.root, title: "switch" },
            h("span", { class: s.touchTarget }),
            h("input", {
                class: s.input,
                type: "checkbox",
                role: "switch",
                checked: "",
            }),
            h(
                "span",
                { class: s.track },
                h("span", { class: s.stateLayer }),
                h(
                    "span",
                    { class: s.handle },
                    h("span", { class: s.icon }, "✓"),
                ),
            ),
        ),
    );
};

const artwork = h(
    "article",
    {
        class: card({ variant: "elevated" }).root,
        style: "width: 240px; display: grid; gap: 12px",
    },
    h("img", { class: media({ aspect: "landscape" }), src: PICTURE, alt: "" }),
    h("h3", { class: text({ style: "titleMedium" }) }, "Hills at dusk"),
    h(
        "p",
        { class: text({ style: "bodyMedium" }) },
        "Styled by the plain CSS adapter.",
    ),
);

// Switch the color scheme on the root, and the named theme on the page.
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

app.setAttribute(
    "style",
    "display: grid; gap: 32px; padding: 32px; min-height: 100dvh; background: var(--colors-surface); color: var(--colors-on-surface)",
);
app.append(
    h(
        "h1",
        { class: text({ style: "headlineMedium" }) },
        "pureform, plain CSS",
    ),
    toggles,
    section("Buttons", buttons),
    section("Shapes", shaped),
    section("Fields", row(field("filled"), field("outlined"))),
    section("Controls", controls()),
    section("Media", artwork),
);
