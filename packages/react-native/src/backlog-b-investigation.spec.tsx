import { createInteractionSource } from "@pureform/binding-core/interaction";
// Investigation-only characterizations; no production behavior or API changes.
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { Button } from "./button";
import { DatePicker } from "./date-picker";
import { DockedDatePicker } from "./docked-date-picker";
import { animated } from "./engine";
import { reanimated } from "./engines/reanimated";
import { FabMenu } from "./fab-menu";
import { FadeThrough } from "./fade-through";
import { Menu } from "./menu";
import { NativeSelect } from "./native-select";
import { SideSheet } from "./side-sheet";
import { Snackbar } from "./snackbar";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import {
    byTestId,
    interact,
    mount,
    outside,
    settle,
    until,
} from "./testing/render";

let registry: TestRegistry;
beforeAll(async () => {
    registry = await presetRegistry([
        "fabMenu",
        "fadeThrough",
        "menu",
        "button",
        "nativeSelect",
        "snackbar",
        "ripple",
        "datePicker",
        "dockedDatePicker",
        "textField",
        "calendarCell",
        "iconButton",
        "scrim",
        "sideSheet",
    ]);
});

describe("backlog B investigation on Native Web", () => {
    it("B2: Snackbar takes button sources through typed slotProps, not new root props", () => {
        const props: ComponentProps<typeof Snackbar> = {
            // @ts-expect-error The ready-made has no per-action interaction source prop.
            actionInteractionSource: undefined,
        };
        const slots: NonNullable<ComponentProps<typeof Snackbar>["slotProps"]> =
            {
                action: { interactionSource: undefined },
            };
        expect(props).toHaveProperty("actionInteractionSource");
        expect(slots).toHaveProperty("action");
    });

    it("B2: Snackbar action and close sources stay independent and can be replaced", async () => {
        const action = createInteractionSource();
        const close = createInteractionSource();
        const replacement = createInteractionSource();
        const heard = [action, close, replacement].map(() => [] as string[]);
        const stops = [action, close, replacement].map((source, index) =>
            source.subscribe((event) => heard[index]!.push(event.type)),
        );
        const source = outside(action);
        try {
            await mount(
                <PureformProvider registry={registry} motion="reduce">
                    <source.Holder>
                        {(current) => (
                            <Snackbar
                                open
                                supportingText="Saved"
                                action="Undo"
                                slotProps={{
                                    action: { interactionSource: current },
                                    close: { interactionSource: close },
                                }}
                            />
                        )}
                    </source.Holder>
                </PureformProvider>,
            );
            await interact(() =>
                userEvent.click(byTestId("pf-snackbar-action")),
            );
            expect(heard[0]).toContain("press");
            expect(heard[1]).not.toContain("press");
            await source.set(replacement);
            const count = heard[0]!.filter((event) => event === "press").length;
            await interact(() =>
                userEvent.click(byTestId("pf-snackbar-action")),
            );
            expect(heard[0]!.filter((event) => event === "press")).toHaveLength(
                count,
            );
            expect(heard[2]).toContain("press");
            await interact(() =>
                userEvent.click(byTestId("pf-snackbar-close")),
            );
            expect(heard[1]).toContain("press");
        } finally {
            for (const stop of stops) stop();
        }
    });

    it("B3: FabMenu accepts per-item prefixes and partial ID maps", async () => {
        const item: NonNullable<
            ComponentProps<typeof FabMenu>["items"]
        >[number] = {
            value: "one",
            label: "One",
            testId: "requested-one",
        };
        expect(item).toHaveProperty("testId");
        await mount(
            <PureformProvider registry={registry} motion="reduce">
                <FabMenu
                    defaultOpen
                    fabLabel="Create"
                    icon="+"
                    items={[
                        item,
                        {
                            value: "two",
                            label: "Two",
                            testId: { item: "chosen" },
                        },
                    ]}
                />
            </PureformProvider>,
        );
        await until(() =>
            expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(
                2,
            ),
        );
        expect(
            [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
                item.getAttribute("data-testid"),
            ),
        ).toEqual(["requested-one-item", "chosen"]);
        expect(byTestId("requested-one-item-label").textContent).toBe("One");
        expect(byTestId("pf-fab-menu-item-label").textContent).toBe("Two");
    });

    it("B3: NativeSelect has no option slot key or per-option test IDs on Native Web", async () => {
        const slots: NonNullable<
            ComponentProps<typeof NativeSelect>["slotProps"]
        > = {
            // @ts-expect-error NativeSelect exposes root/select/icon, not option hosts.
            option: { testID: "option" },
        };
        expect(slots).toHaveProperty("option");
        await mount(
            <PureformProvider registry={registry}>
                <NativeSelect
                    aria-label="Size"
                    items={[{ value: "s", label: "Small" }]}
                />
            </PureformProvider>,
        );
        expect(
            document.querySelector("option")!.getAttribute("data-testid"),
        ).toBeNull();
    });

    it("B3: DatePicker and docked triggers honor prefixes/maps and keep default IDs", async () => {
        await mount(
            <PureformProvider registry={registry}>
                <DatePicker
                    trigger="Date"
                    testId={{ trigger: "custom-date" }}
                    style={{ trigger: { opacity: 0.5 } }}
                />
                <DockedDatePicker label="Booking" testId="booking" />
                <DockedDatePicker label="Default" />
                <DockedDatePicker
                    label="Mapped"
                    testId={{ trigger: "mapped-trigger" }}
                />
            </PureformProvider>,
        );
        expect(getComputedStyle(byTestId("custom-date")).opacity).toBe("0.5");
        expect(byTestId("booking-root")).toBeTruthy();
        expect(byTestId("pf-docked-date-picker-trigger")).toBeTruthy();
        expect(byTestId("booking-trigger")).toBeTruthy();
        expect(byTestId("mapped-trigger")).toBeTruthy();
    });

    it.each([animated, reanimated])(
        "B4: RTL cascade arrows traverse and return on $name",
        async (engine) => {
            await mount(
                <PureformProvider
                    registry={registry}
                    engine={engine}
                    motion="reduce"
                    dir="rtl"
                >
                    <View style={{ width: 600, padding: 100 }}>
                        <Menu
                            trigger="Edit"
                            submenu="cascade"
                            items={[
                                { value: "cut", label: "Cut" },
                                {
                                    value: "share",
                                    label: "Share",
                                    items: [
                                        {
                                            value: "off",
                                            label: "Disabled",
                                            disabled: true,
                                        },
                                        { value: "mail", label: "Mail" },
                                        { value: "link", label: "Link" },
                                    ],
                                },
                            ]}
                        />
                    </View>
                </PureformProvider>,
            );
            await interact(() => userEvent.click(byTestId("pf-button-root")));
            await until(() =>
                expect(document.activeElement?.textContent).toContain("Cut"),
            );
            await interact(() => userEvent.keyboard("{ArrowDown}{ArrowLeft}"));
            await until(() =>
                expect(document.activeElement?.textContent).toBe("Mail"),
            );
            await interact(() => userEvent.keyboard("{ArrowDown}"));
            expect(document.activeElement?.textContent).toBe("Link");
            await interact(() => userEvent.keyboard("{ArrowRight}"));
            await until(() =>
                expect(document.querySelectorAll('[role="menu"]')).toHaveLength(
                    1,
                ),
            );
            expect(document.activeElement?.textContent).toContain("Share");
        },
    );

    it.each([animated, reanimated])(
        "B7: FadeThrough keeps the driver's enter phase after completion on $name, without replaying",
        async (base) => {
            const completed: string[] = [];
            const phases: string[] = [];
            const engine = {
                ...base,
                presence: () => {
                    const driver = base.presence!();
                    return {
                        ...driver,
                        run: (
                            ...[phase, motion, done]: Parameters<
                                typeof driver.run
                            >
                        ) => {
                            phases.push(phase);
                            return driver.run(phase, motion, (ended) => {
                                completed.push(ended);
                                done(ended);
                            });
                        },
                        view: (...args: Parameters<typeof driver.view>) => {
                            // Animated completes in run(); Reanimated completes through view callbacks.
                            const view = driver.view(
                                args[0],
                                args[1],
                                (ended) => {
                                    completed.push(ended);
                                    args[2](ended);
                                },
                            );
                            return {
                                ...view,
                                props: {
                                    ...view.props,
                                    dataSet: { investigationPhase: args[0] },
                                },
                            };
                        },
                    };
                },
            };
            const value = outside("home");
            await mount(
                <PureformProvider
                    registry={registry}
                    engine={engine}
                    motion="reduce"
                >
                    <value.Holder>
                        {(shown) => (
                            <FadeThrough value={shown}>
                                {(page) => <Text>{page}</Text>}
                            </FadeThrough>
                        )}
                    </value.Holder>
                </PureformProvider>,
            );
            await value.set("mail");
            await until(() => expect(completed).toContain("enter"));
            await until(() =>
                expect(
                    document.querySelectorAll(
                        '[data-testid="pf-fade-through-page"]',
                    ),
                ).toHaveLength(1),
            );
            const page = byTestId("pf-fade-through-page");
            expect(page.textContent).toBe("mail");
            expect(page.dataset.investigationPhase).toBe("enter");
            const calls = phases.length;
            await settle(100);
            expect(phases).toHaveLength(calls);
            expect(getComputedStyle(page).opacity).toBe("1");
        },
    );

    it.each([animated, reanimated])(
        "B5: a narrow side sheet travels its measured width on $name",
        async (base) => {
            const travels: number[] = [];
            const engine = {
                ...base,
                presence: () => {
                    const driver = base.presence!();
                    return {
                        ...driver,
                        run: (...args: Parameters<typeof driver.run>) => {
                            if (args[0] === "enter")
                                travels.push(
                                    args[1].enter.from.translateX ?? 0,
                                );
                            return driver.run(...args);
                        },
                    };
                },
            };
            await mount(
                <PureformProvider
                    registry={registry}
                    engine={engine}
                    motion="full"
                >
                    <SideSheet
                        modal={false}
                        open
                        headline="Filters"
                        style={{ content: { width: 180 } }}
                    >
                        Options
                    </SideSheet>
                </PureformProvider>,
            );
            await until(() => expect(travels.length).toBeGreaterThan(0));
            const root = byTestId("pf-side-sheet-content");
            expect(root.getBoundingClientRect().width).toBe(180);
            expect(travels).toEqual([180]);
            expect(travels[0]).toBeLessThan(window.innerWidth);
        },
    );

    it("B8: Native Snackbar keeps an empty live region while closed", async () => {
        const open = outside(false);
        await mount(
            <PureformProvider registry={registry} motion="reduce">
                <open.Holder>
                    {(shown) => (
                        <Snackbar open={shown} supportingText="Saved" />
                    )}
                </open.Holder>
            </PureformProvider>,
        );
        const region = document.querySelector('[role="status"]')!;
        expect(region.textContent).toBe("");
        await open.set(true);
        await until(() =>
            expect(
                document.querySelector('[role="status"]')?.textContent,
            ).toContain("Saved"),
        );
        expect(
            document
                .querySelector('[role="status"]')
                ?.getAttribute("aria-live"),
        ).toBe("polite");
        await open.set(false);
        expect(region.textContent).toBe("");
        await open.set(true);
        expect(document.querySelector('[role="status"]')).toBe(region);
        expect(region.textContent).toBe("Saved");
    });

    it("B9: click-only Button activation runs onPress with one source press/release", async () => {
        const source = createInteractionSource();
        const seen: string[] = [];
        let clicks = 0;
        const stop = source.subscribe((event) => seen.push(event.type));
        try {
            await mount(
                <PureformProvider registry={registry}>
                    <Button
                        interactionSource={source}
                        onPress={() => {
                            clicks++;
                        }}
                        label="Save"
                    />
                </PureformProvider>,
            );
            await interact(() => byTestId("pf-button-root").click());
            expect(clicks).toBe(1);
            expect(seen).toEqual(["press", "release"]);
        } finally {
            stop();
        }
    });
});
