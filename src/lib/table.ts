/**
 * Shared table vocabulary. Lives here rather than in either the data
 * definitions or the table components, so neither has to depend on the other.
 */

/** How a column presents itself on a phone, where tables become cards. */
export type CardRole = 'title' | 'subtitle' | 'tag' | 'field' | 'hidden'

export type Align = 'left' | 'right'
