export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--player-h)+16px)] z-70 flex justify-center px-4"
    >
      <p className="max-w-sm animate-fade-in rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium shadow-dropdown">{message}</p>
    </div>
  )
}
