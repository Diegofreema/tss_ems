export const settingsKeys = {
  all: ['settings'] as const,
  detail: () => [...settingsKeys.all, 'detail'] as const,
  options: () => [...settingsKeys.all, 'options'] as const,
}
