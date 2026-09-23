/** The full-height accent panel; dropped under 900px. */
export function AuthPoster() {
  return (
    <aside className="hidden flex-col justify-between border-r-2 border-foreground bg-brand p-10 text-white lg:flex">
      <div className="flex items-center gap-3">
        <div className="size-6.5 flex-none bg-white" />
        <div className="font-heading text-base font-extrabold tracking-[-0.01em]">
          NETPRO EMS
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] opacity-85">
          Bronze edition
        </div>
        <div className="mt-3.5 font-heading text-[46px] leading-[1.02] font-extrabold tracking-[-0.03em] text-pretty">
          One school, one record.
        </div>
        <p className="mt-4 max-w-[34ch] text-[14.5px] leading-normal opacity-90">
          Fees, results, attendance and admissions in a single system the
          office, the staff room and the home all read from.
        </p>
      </div>

      <div className="border-t-2 border-white/50 pt-4 text-[11.5px] leading-normal opacity-90">
        Trouble signing in? Call the school office on 0803 000 0000, Monday to
        Friday, 8am–4pm.
      </div>
    </aside>
  );
}
