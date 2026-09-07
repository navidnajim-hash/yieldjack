/** Audit status stays "Independent audit pending" unless a future committed configuration
 *  change explicitly updates this exact status — never claim an audit has happened. */
const AUDIT_STATUS = "Independent audit pending";

export function AuditStatus() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-5 py-4">
      <span className="text-sm font-medium text-foreground">Audit status</span>
      <span className="text-sm font-semibold text-warning">{AUDIT_STATUS}</span>
    </div>
  );
}
