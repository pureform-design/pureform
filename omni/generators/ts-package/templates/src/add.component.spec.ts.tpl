import { expect, test } from "vitest";
import { add } from "./add";

// Replace with a component test: render the component with its provider and assert on the page.
test("renders in a real browser", () => {
    const element = document.createElement("output");
    element.textContent = String(add(1, 2));
    document.body.append(element);

    expect(element.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(element.textContent).toBe("3");
    element.remove();
});
