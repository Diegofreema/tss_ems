/** Kicker, 34px title and supporting line — every auth screen opens with this. */
export function AuthHeading({
  kicker,
  title,
  description,
}: {
  kicker?: string
  title: string
  description?: string
}) {
  return (
    <>
      {kicker && (
        <div className="text-[10px] uppercase tracking-[0.12em] text-brand-700">
          {kicker}
        </div>
      )}
      <h2 className="mt-2.5 text-[34px] tracking-[-0.02em]">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </>
  )
}
