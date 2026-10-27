import { DEFAULT_ICON_STYLE } from "@pureform/binding-core";
import type { PerInstance } from "@pureform/binding-core";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { describe, expect, it, vi } from "vitest";

import { overDefaults } from "./defaults";

describe("Native defaults", () => {
    it("has no CSS color fallback", () =>
        expect(DEFAULT_ICON_STYLE.color).toBeUndefined());
    it("flattens nested StyleProp arrays and registered styles with own precedence", () => {
        const registered = StyleSheet.create({
            root: { margin: 2, padding: 3 },
        }).root;
        const result = overDefaults<{
            style?: { root?: StyleProp<ViewStyle> };
        }>(
            { style: { root: [registered, false, [{ opacity: 0.5 }]] } },
            { style: { root: [{ padding: 7 }, null, [{ opacity: 1 }]] } },
        );
        expect(result.style!.root).toEqual({
            margin: 2,
            padding: 7,
            opacity: 1,
        });
    });
    it("merges plain style records as before and lets an unset side through", () => {
        const result = overDefaults<{
            style?: {
                root?: StyleProp<ViewStyle>;
                label?: StyleProp<ViewStyle>;
            };
        }>(
            {
                style: {
                    root: { margin: 1, padding: 2 },
                    label: { margin: 3 },
                },
            },
            {
                style: {
                    root: { padding: undefined, opacity: 1 },
                    label: null,
                },
            },
        );
        expect(result.style!.root).toStrictEqual({
            margin: 1,
            padding: undefined,
            opacity: 1,
        });
        expect(result.style!.label).toBeNull();
    });
    it("preserves empty identities, own-wins tokens and lazy repeated styles", () => {
        type Props = {
            tokens?: object;
            style?: {
                row?: PerInstance<StyleProp<ViewStyle>, { index: number }>;
            };
        };
        const base = vi.fn<
            (instance: { index: number }) => StyleProp<ViewStyle> | undefined
        >(({ index }: { index: number }) => [{ margin: index, padding: 2 }]);
        const own = vi.fn<
            (instance: { index: number }) => StyleProp<ViewStyle> | undefined
        >(() => [{ padding: 6 }]);
        const defaults: Props = {
            tokens: { a: 1, b: 2 },
            style: { row: base },
        };
        expect(overDefaults(defaults, {})).toBe(defaults);
        expect(overDefaults(undefined, defaults)).toBe(defaults);
        const result = overDefaults<Props>(defaults, {
            tokens: { a: undefined, c: 3 },
            style: { row: own },
        });
        expect(result.tokens).toStrictEqual({ a: undefined, b: 2, c: 3 });
        expect(base).not.toHaveBeenCalled();
        expect(own).not.toHaveBeenCalled();
        expect(
            (result.style!.row as (i: { index: number }) => unknown)({
                index: 4,
            }),
        ).toEqual({ margin: 4, padding: 6 });
    });
});
