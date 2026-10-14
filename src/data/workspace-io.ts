import { SCHEMA_VERSION } from "@/domain/types";
import type { Workspace } from "@/domain/types";
import { WorkspaceExportSchema } from "./schema";

export interface WorkspaceExport {
  app: "flexstudy";
  schemaVersion: number;
  exportedAt: string;
  workspace: Workspace;
}

export type ImportResult =
  | { ok: true; workspace: Workspace; exportedAt: string | null }
  | { ok: false; errors: string[] };

export interface ExportCounts {
  categories: number;
  templates: number;
  instances: number;
  reflections: number;
  shiftEvents: number;
}

export function countWorkspace(workspace: Workspace): ExportCounts {
  return {
    categories: workspace.categories.length,
    templates: workspace.templates.length,
    instances: workspace.instances.length,
    reflections: workspace.reflections.length,
    shiftEvents: workspace.shiftEvents.length,
  };
}

export function serializeWorkspace(workspace: Workspace, now: number): string {
  const payload: WorkspaceExport = {
    app: "flexstudy",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    workspace,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates a backup before anything is written. Import is a destructive
 * operation, so the caller shows these numbers and asks for confirmation first.
 */
export function parseWorkspaceImport(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["json.invalid"] };
  }

  const parsed = WorkspaceExportSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
    return { ok: false, errors: errors.length > 0 ? errors : ["schema.mismatch"] };
  }

  return { ok: true, workspace: parsed.data.workspace, exportedAt: parsed.data.exportedAt };
}

export function suggestExportFileName(now: number): string {
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `flexstudy-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}.json`;
}
