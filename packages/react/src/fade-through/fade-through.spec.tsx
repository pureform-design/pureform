import { testIds } from "@pureform/anatomy";
import { act, cleanup } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { FadeThrough } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { mount, settle, until } from "../testing/render";

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
    cleanup();
    document.head
        .querySelectorAll("style[data-test]")
        .forEach((style) => style.remove());
});

let show: (value: string) => void = () => {};

function Pages() {
    const [value, setValue] = useState("home");
    show = (next) => act(() => setValue(next));
    return (
        <PureformProvider registry={navigationRegistry()}>
            <FadeThrough value={value} aria-label="Pages">
                <p>{value}</p>
            </FadeThrough>
        </PureformProvider>
    );
}

describe("FadeThrough", () => {
    it("shows the first page without a state, in the preset's structure", async () => {
        mount(<Pages />);
        await settle();
        const root = document.querySelector<HTMLElement>(
            `[data-testid="${ids.root}"]`,
        )!;
        expect(root.getAttribute("aria-label")).toBe("Pages");
        expect(root.className).toBe("fade-through");
        expect(pages()).toHaveLength(1);
        expect(pages()[0]!.parentElement).toBe(root);
        expect(pages()[0]!.hasAttribute("data-state")).toBe(false);
        expect(pages()[0]!.textContent).toBe("home");
    });

    it("sends the shown page out and brings the new one in, then drops the old once its exit ends", async () => {
        leaving(200);
        mount(<Pages />);
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
        mount(<Pages />);
        await settle();
        show("mail");
        await settle();
        expect(pages().map((page) => page.textContent)).toEqual(["mail"]);
    });

    it("takes a function of the value, each page showing its own", async () => {
        leaving(400);
        let set: (value: string) => void = () => {};
        function ByValue() {
            const [value, setValue] = useState("home");
            set = (next) => act(() => setValue(next));
            return (
                <PureformProvider registry={navigationRegistry()}>
                    <FadeThrough value={value}>
                        {(shown) => <p>{shown}</p>}
                    </FadeThrough>
                </PureformProvider>
            );
        }
        mount(<ByValue />);
        await settle();
        set("mail");
        expect(pages().map((page) => page.textContent)).toEqual([
            "home",
            "mail",
        ]);
    });

    it("brings a page back that was still leaving", async () => {
        leaving(400);
        mount(<Pages />);
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
