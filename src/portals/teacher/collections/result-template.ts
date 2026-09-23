/**
 * The spreadsheet a results upload is read from.
 *
 * The office's parser reads by column position, not by heading: A is the
 * registration number, B the CA, and C, D and E the three exam sittings it
 * sums into one exam mark. So the headings here are for the person filling it
 * in, and the **order is the contract** — a sheet with the right words in the
 * wrong columns is a sheet of marks filed against the wrong thing.
 *
 * Written out for the teacher rather than described to them, because the file
 * they upload is the one thing on this page nobody can check before the office
 * reads it: a wrong shape comes back as a rejected batch days later. The
 * template is filled with their own arm's registration numbers, so the only
 * thing left to do is type the marks.
 */

/** Column A through E, in the order the parser reads them. */
export const RESULT_COLUMNS = [
  'Registration Number',
  'CA',
  '1st Exam',
  '2nd Exam',
  '3rd Exam',
] as const

/**
 * One cell of the template. `null` is a cell left for the teacher to type
 * into, which is every mark on every row.
 */
export type TemplateCell = { value: string; heading?: true } | null

/**
 * The sheet, cell by cell.
 *
 * Kept as plain data and away from the writer, so the shape the office depends
 * on is a pure function with a test beside it rather than something that can
 * only be checked by opening a downloaded file.
 *
 * A roll with nobody on it still gets the heading row: the shape is the point,
 * and a teacher can type the numbers in by hand.
 */
export function templateSheet(regnos: readonly string[]): TemplateCell[][] {
  return [
    RESULT_COLUMNS.map((label) => ({ value: label, heading: true as const })),
    ...regnos
      .map((regno) => regno.trim())
      .filter(Boolean)
      // Four nulls, so every row already has its five cells and the columns
      // land where the parser expects them even before anything is typed.
      .map((regno) => [{ value: regno }, null, null, null, null]),
  ]
}

/** Wide enough for a registration number, then five narrow mark columns. */
const WIDTHS = [24, 10, 12, 12, 12]

/**
 * The template as a real `.xlsx`.
 *
 * A workbook rather than a CSV because that is what a school opens: a CSV
 * lands in Excel as a wall of unformatted text, loses the column widths, and
 * on a machine with a different list separator can split the wrong way
 * entirely. The endpoint takes all three extensions, so the one that opens
 * cleanly is the one to hand over.
 *
 * The writer is imported on the press rather than at the top of the file. It
 * is the only place in the app that builds a spreadsheet, and a teacher who
 * never uploads one should not carry it in their bundle — this portal is used
 * on the connections the whole app exists to cope without.
 */
export async function resultTemplateFile(regnos: readonly string[]): Promise<Blob> {
  const writeXlsxFile = (await import('write-excel-file/browser')).default

  const rows = templateSheet(regnos).map((row) =>
    row.map((cell) =>
      cell === null
        ? null
        : cell.heading
          ? {
              value: cell.value,
              type: String,
              fontWeight: 'bold' as const,
              backgroundColor: '#EEF1F4',
              borderBottomStyle: 'thin' as const,
              borderBottomColor: '#B9C1CA',
            }
          : { value: cell.value, type: String },
    ),
  )

  return writeXlsxFile(rows, {
    sheet: 'Results',
    columns: WIDTHS.map((width) => ({ width })),
    // The headings stay in view on a long roll, which is the difference
    // between typing into the CA column and typing into the 2nd Exam column.
    stickyRowsCount: 1,
  }).toBlob()
}

/** What the file is called when it lands in the teacher's downloads. */
export function templateName(subject?: string, arm?: string): string {
  const parts = ['results', subject, arm]
    .map((part) => part?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean)
  return `${parts.join('-').replace(/-+/g, '-')}.xlsx`
}
