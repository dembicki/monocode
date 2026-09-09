// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccessPicker } from "./AccessPicker";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("AccessPicker keyboard controls", () => {
  it("handles arrows and selection from the trigger", async () => {
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        createElement(AccessPicker, {
          value: "supervised",
          onChange,
        }),
      ),
    );
    const trigger = container.querySelector("button");

    await act(async () => {
      expect(keydown(trigger, "ArrowDown")).toBe(false);
    });
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    await act(async () => {
      keydown(trigger, "Enter");
    });
    expect(onChange).toHaveBeenCalledWith("auto-accept-edits");
  });
});

function keydown(target: Element | null, key: string) {
  return target?.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}
