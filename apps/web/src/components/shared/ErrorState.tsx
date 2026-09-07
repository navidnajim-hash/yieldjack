export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
        >
          Try again
        </button>
      )}
    </div>
  );
}
