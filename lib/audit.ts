import { supabase } from "@/lib/supabase"

export type AuditActionType = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "RETURN" | "ARCHIVE"
export type AuditEntityType = "user" | "barber" | "service" | "product" | "minibar" | "invoice" | "customer" | "appointment"

interface AuditEntry {
  actionType: AuditActionType
  entityType: AuditEntityType
  entityId: string
  entityName: string
  performedBy: string | null
  performerName: string | null
  details?: Record<string, unknown>
}

export function logAudit(entry: AuditEntry): void {
  supabase
    .from("audit_logs")
    .insert({
      action_type: entry.actionType,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      entity_name: entry.entityName,
      performed_by: entry.performedBy,
      performer_name: entry.performerName,
      details: entry.details ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[audit]", entry.actionType, entry.entityType, error.message)
    })
}
