
/** Scoped to the signed-in pupil, so no id appears in the key. */
export const mySchoolingKeys = {
  all: ['my-schooling'] as const,
  record: () => [...mySchoolingKeys.all, 'record'] as const,
  dashboard: () => [...mySchoolingKeys.all, 'dashboard'] as const,
  courses: () => [...mySchoolingKeys.all, 'courses'] as const,
  invoices: () => [...mySchoolingKeys.all, 'invoices'] as const,
  materials: () => [...mySchoolingKeys.all, 'materials'] as const,
}
