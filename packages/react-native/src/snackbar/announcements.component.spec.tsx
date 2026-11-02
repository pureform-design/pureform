import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { Snackbar, useSnackbar } from ".";
import { PureformProvider } from "..";
import { presetRegistry, type TestRegistry } from "../testing/registry";
import { interact, mount, outside, until } from "../testing/render";

let registry: TestRegistry;
const platform = Platform.OS;
beforeAll(async () => {
    registry = await presetRegistry(["snackbar", "ripple"]);
});
afterEach(() => {
    Platform.OS = platform;
    vi.restoreAllMocks();
});

// These verify dispatch to the OS API, not actual speech. Native Web's live-region contract
// is tested separately, and Android relies on accessibilityLiveRegion rather than this API.
it("announces standalone iOS openings and message changes once, including identical reopenings", async () => {
    Platform.OS = "ios";
    const announce = vi
        .spyOn(AccessibilityInfo, "announceForAccessibility")
        .mockImplementation(() => {});
    const open = outside(false);
    const message = outside("Saved");
    await mount(
        <PureformProvider registry={registry} motion="reduce">
            <open.Holder>
                {(shown) => (
                    <message.Holder>
                        {(text) => (
                            <Snackbar open={shown} supportingText={text} />
                        )}
                    </message.Holder>
                )}
            </open.Holder>
        </PureformProvider>,
    );
    expect(announce).not.toHaveBeenCalled();
    await open.set(true);
    expect(announce).toHaveBeenCalledExactlyOnceWith("Saved");
    await message.set("Changed");
    expect(announce).toHaveBeenLastCalledWith("Changed");
    await open.set(false);
    expect(announce).toHaveBeenCalledTimes(2);
    await open.set(true);
    expect(announce.mock.calls.map(([text]) => text)).toEqual([
        "Saved",
        "Changed",
        "Changed",
    ]);
});

it("announces each queued iOS message once, without a second queue-level announcement", async () => {
    Platform.OS = "ios";
    const announce = vi
        .spyOn(AccessibilityInfo, "announceForAccessibility")
        .mockImplementation(() => {});
    let queue!: ReturnType<typeof useSnackbar>;
    function Capture() {
        const current = useSnackbar();
        useEffect(() => {
            queue = current;
        }, [current]);
        return null;
    }
    await mount(
        <PureformProvider registry={registry} motion="reduce" timeScale={0}>
            <Capture />
        </PureformProvider>,
    );
    let first = "";
    await interact(() => {
        first = queue.show({ supportingText: "Saved", duration: 0 });
    });
    await until(() => expect(announce).toHaveBeenCalledTimes(1));
    await interact(() => {
        queue.show({ supportingText: "Saved", duration: 0 });
        queue.dismiss(first);
    });
    await until(() => expect(announce).toHaveBeenCalledTimes(2));
    expect(announce.mock.calls.map(([text]) => text)).toEqual([
        "Saved",
        "Saved",
    ]);
});

it("does not dispatch explicit iOS announcements on Android", async () => {
    Platform.OS = "android";
    const announce = vi
        .spyOn(AccessibilityInfo, "announceForAccessibility")
        .mockImplementation(() => {});
    await mount(
        <PureformProvider registry={registry}>
            <Snackbar supportingText="Saved" />
        </PureformProvider>,
    );
    expect(announce).not.toHaveBeenCalled();
});
