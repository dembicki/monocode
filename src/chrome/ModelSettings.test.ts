// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelSetting } from "../lib/models";
import { SelectSetting, ToggleSetting } from "./ModelSettings";

const FAST_SETTING: ModelSetting = {
  id: "fast",
  label: "Fast",
  kind: "toggle",
  value: "false",
};

const EFFORT_SETTING: ModelSetting = {
  id: "effort",
  label: "Reasoning",
  kind: "select",
  value: "medium",
  options: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ],
};

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

describe("ToggleSetting keyboard controls", () => {
  it("selects Standard with ArrowUp and Fast with ArrowDown", async () => {
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        createElement(ToggleSetting, {
          setting: FAST_SETTING,
          value: "false",
          onChange,
        }),
      ),
    );
    const button = container.querySelector("button");

    expect(keydown(button, "ArrowDown")).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith("true");
    expect(keydown(button, "ArrowUp")).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith("false");
  });

  it("tabs to the next model control", async () => {
    await act(async () =>
      root.render(
        createElement(
          "div",
          { className: "composer-toolbar" },
          createElement(ToggleSetting, {
            setting: FAST_SETTING,
            value: "false",
            onChange: vi.fn(),
          }),
          createElement("button", { "data-model-control": "" }, "Access"),
        ),
      ),
    );
    const buttons = container.querySelectorAll("button");

    expect(keydown(buttons[0], "Tab")).toBe(false);
    expect(document.activeElement).toBe(buttons[1]);
  });
});

describe("SelectSetting keyboard controls", () => {
  it("handles arrows and selection while focus remains on its trigger", async () => {
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        createElement(SelectSetting, {
          setting: EFFORT_SETTING,
          value: "medium",
          onChange,
        }),
      ),
    );
    const trigger = container.querySelector("button");
    trigger?.focus();

    await act(async () => {
      expect(keydown(trigger, "ArrowDown")).toBe(false);
    });
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    await act(async () => {
      keydown(trigger, "Enter");
    });
    expect(onChange).toHaveBeenCalledWith("high");
  });
});

function keydown(target: Element | undefined, key: string) {
  return target?.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}
