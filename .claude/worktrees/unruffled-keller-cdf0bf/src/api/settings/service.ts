import { request } from '../client'
import type { SchoolSettings, SettingsBody, SettingsOptions } from './types'

export const settingsService = {
  get: () =>
    request<{ settings: SchoolSettings }>('settings').then((data) => data.settings),

  options: () => request<SettingsOptions>('settings/options'),

  update: (body: SettingsBody) =>
    request<{ settings: SchoolSettings }>('settings', { method: 'POST', body }),

  /**
   * The one place the current session is chosen — the Sessions endpoints
   * expose it read-only.
   */
  setCurrentSession: (sessionId: number) =>
    request<unknown>('settings/current-session', {
      method: 'POST',
      body: { session_id: sessionId },
    }),

  setCurrentTerm: (semesterId: number) =>
    request<unknown>('settings/current-term', {
      method: 'POST',
      body: { semester_id: semesterId },
    }),
}
