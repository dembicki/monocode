import { openUrl } from "@tauri-apps/plugin-opener";
import { gitPrCreate, type GitDiffIndex, type GitPr } from "./fs";
import { generatePrContent } from "./harness";
import type { HarnessId } from "./session";

export function prCreateBlocker(index: GitDiffIndex): string | null {
  if (!index.branch) return "Check out a branch before creating a pull request.";
  if (!index.remote) return "Add a Git remote before creating a pull request.";
  if (index.ahead > 0 && index.behind > 0) {
    return `Sync ${index.branch} with ${index.upstream ?? "its upstream"} before creating a pull request.`;
  }
  if (index.behind > 0) {
    return `Pull ${index.behind} commit${index.behind === 1 ? "" : "s"} before creating a pull request.`;
  }
  if (index.files.length > 0) {
    return "Commit or discard the working tree changes before creating a pull request.";
  }
  if (index.aheadOfDefault <= 0) {
    return `There are no commits to merge into ${index.defaultBranch ?? "the default branch"}.`;
  }
  return null;
}

export function describePrCreate(index: GitDiffIndex): string {
  const blocker = prCreateBlocker(index);
  if (blocker) return blocker;
  const branch = index.branch ?? "HEAD";
  const base = index.defaultBranch ?? "the default branch";
  const push = index.ahead > 0
    ? ` Push ${index.ahead} commit${index.ahead === 1 ? "" : "s"} first, then create it?`
    : " Create it now?";
  return `Create a pull request from ${branch} into ${base}.${push}`;
}

export async function createAndOpenPullRequest(
  cwd: string,
  textHarness?: HarnessId,
): Promise<void> {
  const content = await generatePrContent(cwd, textHarness);
  if (!content) throw new Error("Could not prepare pull request content");
  const url = await gitPrCreate(
    cwd,
    content.title,
    content.body,
    content.base,
    content.head,
  );
  await openUrl(url.trim());
}

export type PrPaletteCommand =
  | { kind: "loading" }
  | { kind: "open"; pr: GitPr }
  | { kind: "create" };

export function palettePrCommand(
  pr: GitPr | null,
  settled: boolean,
): PrPaletteCommand {
  if (!settled) return { kind: "loading" };
  if (pr?.state === "open" && pr.url) return { kind: "open", pr };
  return { kind: "create" };
}
