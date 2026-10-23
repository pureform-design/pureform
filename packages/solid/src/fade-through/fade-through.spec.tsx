import { testIds } from "@pureform/anatomy";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { FadeThrough } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = testIds.fadeThrough;

const pages = () => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${ids.page}"]`),
];

// A leaving page that fades for a while, so a test can see it before it goes.
const leaving = (ms: number) => {
    const style = document.head.appendChild(document.createElement("style"));
    style.dataset.test = "";
    style.textContent = `@keyframes test-out { to { opacity: 0 } }
        .fade-through__page[data-state=closed] { animation: test-out ${ms}ms forwards }`;
};

afterEach(() => {
    document.head
        .querySelectorAll("style[data-test]")
        .forEach((style) => style.remove());
});

const pagesOf = () => {
    const [value, setValue] = createSignal("home");
    mount(() => (
        <PureformProvider registry={navigationRegistry()}>
            <FadeThrough value={value()} aria-label="Pages">
                {(shown) => <p>{shown}</p>}
            </FadeThrough>
        </PureformProvider>
    ));
    return (next: string) => {
        setValue(next);
        flush();
    };
};

describe("FadeThrough", () => {
    it("takes plain content too", async () => {
        mount(() => (
            <PureformProvider registry={navigationRegistry()}>
                <FadeThrough value="home">
                    <p>Home</p>
                </FadeThrough>
            </PureformProvider>
        ));
        await settle();
        expect(pages().map((page) => page.textContent)).toEqual(["Home"]);
    });

    it("shows the first page without a state, in the preset's structure", async () => {
        pagesOf();
        await settle();
        const root = byTestId(ids.root);
        expect(root.getAttribute("aria-label")).toBe("Pages");
        expect(root.className).toBe("fade-through");
        expect(pages()).toHaveLength(1);
        expect(pages()[0]!.parentElement).toBe(root);
        expect(pages()[0]!.hasAttribute("data-state")).toBe(false);
        expect(pages()[0]!.textContent).toBe("home");
    });

    it("sends the shown page out as it was and brings the new one in, then drops the old once its exit ends", async () => {
        leaving(200);
        const show = pagesOf();
        await settle();
        show("mail");
        const [out, into] = pages();
        expect(out!.textContent).toBe("home");
        expect(out!.dataset.state).toBe("closed");
        expect(out!.getAttribute("aria-hidden")).toBe("true");
        expect(out!.inert).toBe(true);
        expect(into!.textContent).toBe("mail");
        expect(into!.dataset.state).toBe("open");
        await until(() => expect(pages()).toHaveLength(1));
        expect(pages()[0]).toBe(into);
    });

    it("drops the old page at once when nothing animates it (unstyled)", async () => {
        const show = pagesOf();
        await settle();
        show("mail");
        await settle();
        expect(pages().map((page) => page.textContent)).toEqual(["mail"]);
    });

    it("brings a page back that was still leaving", async () => {
        leaving(400);
        const show = pagesOf();
        await settle();
        show("mail");
        show("home");
        expect(
            pages().map((page) => [page.textContent, page.dataset.state]),
        ).toEqual([
            ["mail", "closed"],
            ["home", "open"],
        ]);
        await until(() => expect(pages()).toHaveLength(1));
        expect(pages()[0]!.textContent).toBe("home");
    });
});
