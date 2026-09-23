/** The title and its supporting line — every auth screen opens with this. */
export function AuthHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <>
      <h2 className="font-heading text-(length:--auth-title) leading-[1.2] font-extrabold tracking-[-0.01em]">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-base leading-normal text-ui-muted">
          {description}
        </p>
      )}
    </>
  )
}
