/** Classes comuns de Input, Textarea e Select. */
export const controlClasses = [
  'w-full rounded-control border border-border bg-surface-2 text-14 text-fg placeholder:text-fg-muted',
  'transition-[border-color,background-color,box-shadow] duration-(--dur-base) ease-out',
  'hover:border-border-strong',
  // foco: borda laranja e um halo suave (o contorno transparente aparece no modo de alto contraste)
  'focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-soft)] focus-visible:outline-2 focus-visible:outline-transparent',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border',
  'aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--ds-danger-soft)]',
].join(' ')
