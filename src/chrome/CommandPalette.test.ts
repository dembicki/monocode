// @vitest-environment happy-dom
import { act, createElement, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

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

describe("CommandPalette choices", () => {
  it("opens predefined options and submits the selected value", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const props: ComponentProps<typeof CommandPalette> = {
      open: true,
      onClose,
      commands: [
        {
          id: "update-category",
          label: "Update category…",
          select: {
            placeholder: "Choose a category",
            selectedId: "investigation",
            options: [
              { id: "investigation", label: "Investigation" },
              { id: "bug-fix", label: "Bug fix" },
            ],
            onSelect,
          },
        },
      ],
    };

    await act(async () => root.render(createElement(CommandPalette, props)));
    const command =
      document.querySelector<HTMLButtonElement>('[role="option"]')!;
    await act(async () => command.click());

    expect(
      document.querySelector('[aria-label="Choose a category"]'),
    ).not.toBeNull();
    const options = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Category options"] [role="option"]',
      ),
    ];
    expect(options[0]?.textContent).toContain("Current");

    await act(async () => options[1]?.click());
    expect(onSelect).toHaveBeenCalledWith("bug-fix");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
