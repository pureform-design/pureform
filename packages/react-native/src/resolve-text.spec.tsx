import { render } from "@testing-library/react";
import { Text, View } from "react-native";
import { describe, expect, it } from "vitest";

import type { SlotViews } from "./styles";
import { resolveText } from "./resolve-text";

const views = { View, Text } as unknown as SlotViews;
const style = { color: "rgb(255, 0, 0)" };

const inView = (node: Parameters<typeof resolveText>[0]) =>
  render(<View testID="v">{resolveText(node, views, style)}</View>);

describe("resolveText", () => {
  it("wraps a string or number in the slot's Text with the style", () => {
    const { getByText } = inView("Hello");
    expect(getComputedStyle(getByText("Hello")).color).toBe(style.color);
    expect(inView(3).getByText("3")).toBeTruthy();
  });

  it("wraps each text item of a mixed array and keeps elements", () => {
    const { getByText, getByTestId } = inView([
      "a",
      <View key="e" testID="e" />,
      2,
    ]);
    expect(getByText("a")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByTestId("e")).toBeTruthy();
  });

  it("returns anything else unchanged", () => {
    const el = <View />;
    expect(resolveText(el, views)).toBe(el);
    expect(resolveText(null, views)).toBeNull();
    expect(resolveText(undefined, views)).toBeUndefined();
    expect(resolveText(false, views)).toBe(false);
  });

  it("fails a test when a string lands in a View", () => {
    expect(() => render(<View>raw</View>)).toThrow(/Unexpected text node/);
  });
});
