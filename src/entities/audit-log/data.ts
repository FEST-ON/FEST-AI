import { festivalApi } from "@/shared/lib/api";
import type { AuditLogEntry } from "./model";

interface AuditLogRow {
  id: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_id?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
}

function normalize(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    resourceType: row.resource_type ?? null,
    resourceId: row.resource_id ?? null,
    actorId: row.actor_id ?? null,
    actorName: row.actor_name ?? null,
    actorEmail: row.actor_email ?? null,
    beforeData: row.before_data ?? null,
    afterData: row.after_data ?? null,
    createdAt: row.created_at,
  };
}

export interface AuditLogFilter {
  action?: string;
  resourceType?: string;
}

/** 백엔드가 limit만 받고 커서를 내려주지 않아(nextCursor는 항상 null) 상한은 100건입니다. */
export const AUDIT_LOG_MAX_LIMIT = 100;

export async function fetchAuditLogs(filter: AuditLogFilter = {}, limit = 50) {
  const params = new URLSearchParams({ limit: String(Math.min(limit, AUDIT_LOG_MAX_LIMIT)) });
  if (filter.action) params.set("action", filter.action);
  if (filter.resourceType) params.set("resourceType", filter.resourceType);
  const rows = await festivalApi<AuditLogRow[]>(`/audit-logs?${params.toString()}`);
  return rows.map(normalize);
}
