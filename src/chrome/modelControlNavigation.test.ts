// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  navigateModelControl,
  toggleValueForArrow,
} from "./modelControlNavigation";

afterEach(() => {
  document.body.replaceChildren();
});

describe("navigateModelControl", () => {
  it("moves in both directions and opens picker controls", () => {
    const toolbar = document.createElement("div");
    toolbar.className = "composer-toolbar";
    const model = control("dialog");
    const effort = control("listbox");
    const fast = control();
    const access = control("listbox");
    toolbar.append(model, effort, fast, access);
    document.body.append(toolbar);
    const openEffort = vi.spyOn(effort, "click");
    const openModel = vi.spyOn(model, "click");

    expect(navigateModelControl(model, false)).toBe(true);
    expect(document.activeElement).toBe(effort);
    expect(openEffort).toHaveBeenCalledOnce();

    expect(navigateModelControl(effort, true)).toBe(true);
    expect(document.activeElement).toBe(model);
    expect(openModel).toHaveBeenCalledOnce();
  });

  it("wraps and skips disabled controls", () => {
    const toolbar = document.createElement("div");
    toolbar.className = "composer-toolbar";
    const first = control("dialog");
    const disabled = control("listbox");
    disabled.setAttribute("aria-disabled", "true");
    const last = control("listbox");
    toolbar.append(first, disabled, last);
    document.body.append(toolbar);

    expect(navigateModelControl(first, true)).toBe(true);
    expect(document.activeElement).toBe(last);
    expect(navigateModelControl(last, false)).toBe(true);
    expect(document.activeElement).toBe(first);
  });
});

describe("toggleValueForArrow", () => {
  it("maps vertical arrows to the ordered Standard and Fast values", () => {
    expect(toggleValueForArrow("ArrowUp")).toBe("false");
    expect(toggleValueForArrow("ArrowDown")).toBe("true");
  });

  it("leaves activation and focus keys to the button", () => {
    expect(toggleValueForArrow("Enter")).toBeNull();
    expect(toggleValueForArrow(" ")).toBeNull();
    expect(toggleValueForArrow("Tab")).toBeNull();
  });
});

function control(popup?: "dialog" | "listbox") {
  const button = document.createElement("button");
  button.dataset.modelControl = "";
  if (popup) button.setAttribute("aria-haspopup", popup);
  return button;
}
