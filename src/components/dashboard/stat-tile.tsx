/** Label, headline value and an optional line of context. Text uses text tokens only. */
export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
    </div>
  );
}
