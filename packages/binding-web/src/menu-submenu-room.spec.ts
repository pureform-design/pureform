import { afterEach, describe, expect, it, vi } from "vitest";

import { watchMenuLayout } from "./menu-submenu-room";

class FakeObserver {
    static instances: FakeObserver[] = [];
    observed: Element[] = [];
    disconnected = false;
    constructor(readonly callback: () => void) {
        FakeObserver.instances.push(this);
    }
    observe(element: Element) {
        this.observed.push(element);
    }
    disconnect() {
        this.disconnected = true;
    }
}

const frames: (() => void)[] = [];

const stub = () => {
    FakeObserver.instances = [];
    frames.length = 0;
    vi.stubGlobal("ResizeObserver", FakeObserver);
    vi.stubGlobal("requestAnimationFrame", (fn: () => void) => {
        frames.push(fn);
        return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
        frames[id - 1] = () => {};
    });
};

afterEach(() => vi.unstubAllGlobals());

describe("watchMenuLayout", () => {
    it("starts observing two frames on, checks once as it starts, and leaves the page to resize", () => {
        stub();
        const anchor = document.createElement("button");
        const panel = document.createElement("div");
        panel.append(anchor);
        document.body.append(panel);
        const menu = document.createElement("div");
        const onChange = vi.fn<() => void>();
        const stop = watchMenuLayout(
            { anchors: [anchor, null], content: [menu] },
            onChange,
        );
        expect(FakeObserver.instances).toHaveLength(0);
        frames[0]!();
        expect(FakeObserver.instances).toHaveLength(0);
        frames[1]!();
        const [observer] = FakeObserver.instances;
        expect(observer!.observed).toEqual(
            expect.arrayContaining([menu, anchor, panel]),
        );
        expect(observer!.observed).not.toContain(document.body);
        expect(observer!.observed).not.toContain(document.documentElement);
        expect(onChange).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new Event("resize"));
        expect(onChange).toHaveBeenCalledTimes(2);
        stop();
        window.dispatchEvent(new Event("resize"));
        expect(observer!.disconnected).toBe(true);
        expect(onChange).toHaveBeenCalledTimes(2);
        panel.remove();
    });

    it("never observes when stopped before it starts", () => {
        stub();
        const onChange = vi.fn<() => void>();
        const stop = watchMenuLayout({ anchors: [], content: [] }, onChange);
        stop();
        frames[0]!();
        expect(frames).toHaveLength(1);
        expect(FakeObserver.instances).toHaveLength(0);
        expect(onChange).not.toHaveBeenCalled();
    });
});
