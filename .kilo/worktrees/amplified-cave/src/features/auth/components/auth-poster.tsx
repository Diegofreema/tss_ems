/**
 * The blue half of the sign-in design: what the system is for, the student it
 * is for, and the ripple she is sitting in.
 *
 * Hidden below lg. The design draws no narrow view, and a poster costs a phone
 * a photograph to say something the form beside it already says — on the
 * connections this app is for, that is a poster worth dropping.
 *
 * `--ui-poster` rather than `--ui-blue`: the same colour in daylight, and two
 * colours at night. Half a screen of full-strength brand blue beside a dark
 * form is what makes a page look as though only one of its halves was themed,
 * so the poster deepens — while the button keeps the blue that carries white
 * text, which is a different job and a different token.
 *
 * Held to the height of the screen and stuck there. The two columns are one
 * grid row, so a tall form — the reset screen carries three password fields, a
 * strength bar and a list of rules — used to stretch the poster with it, and
 * the panel drawn at 6.5%/5.3% of a row half again as tall as the window sat
 * with its headline off the top of the screen. Sticking it means the poster is
 * the window's own height whatever the form does, and scrolling the form moves
 * nothing on the left.
 */
export function AuthPoster() {
  return (
    <aside className="relative hidden overflow-hidden bg-ui-poster lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start">
      <Ripple />

      {/* Translucent rather than filled, so the ripple carries on through it —
          the rings are one drawing, not two that have to line up at the edge.

          A column rather than a text block with a photograph placed under it:
          on a 14-inch laptop the student was drawn over the sentence, because
          she was sized against the panel's width and anchored to its foot
          while the panel itself had lost 200px of height. As the last item in
          a column she takes the room the words leave and no more. */}
      <div className="absolute top-[6.5%] right-[10.5%] bottom-[5.3%] left-[9.7%] flex flex-col overflow-hidden rounded-[10px] border border-white/40 bg-white/25 dark:border-white/25 dark:bg-white/14">
        <div className="flex-none px-[6.3%] pt-(--auth-poster-lead) text-white">
          <h1 className="max-w-[9em] font-heading text-(length:--auth-poster-title) leading-[1.2] font-extrabold tracking-[-0.02em]">
            One School one record
          </h1>
          <p className="mt-3 max-w-[27rem] text-(length:--auth-poster-body) leading-[1.45]">
            Fees, result, attendance and admission in one single system, the
            office, staff room, and home all read from.
          </p>
        </div>

        {/* Decorative: the sentence above is what this panel says, and a
            screen reader that announced a stock photograph of a student would
            be announcing something the page does not mean.

            `contain` rather than a width alone, so the room left over is what
            bounds her on a short screen and her own width on a tall one — she
            shrinks instead of climbing over the paragraph. */}
        <img
          src="/auth-student.webp"
          alt=""
          className="mt-6 min-h-0 w-[57.4%] flex-1 self-center object-contain object-bottom"
        />
      </div>
    </aside>
  )
}

/**
 * The rings, centred on the foot of the panel so they read as ripples under
 * the student rather than a target behind her.
 *
 * Drawn rather than gradient-filled: `slice` scales one drawing to whatever
 * shape the column ends up, so the rings keep their spacing on a laptop and a
 * 27-inch screen alike, and the circles stay circles.
 */
function Ripple() {
  return (
    <svg
      viewBox="0 0 568 756"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className="absolute inset-0 size-full"
    >
      <g fill="none" stroke="var(--ui-ring)">
        <circle cx="288" cy="750" r="234" strokeWidth="52" />
        <circle cx="288" cy="750" r="312" strokeWidth="54" />
        <circle cx="288" cy="750" r="420" strokeWidth="66" />
      </g>
    </svg>
  )
}
