/** Classes comuns de Input, Textarea e Select. */
export const controlClasses = [
  'w-full rounded-control border border-border bg-surface-2 text-14 text-fg placeholder:text-fg-muted',
  'transition-[border-color,background-color] duration-(--dur-fast) ease-out',
  'hover:border-border-strong',
  'focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/40',
].join(' ')
