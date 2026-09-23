/**
 * How a `ConfirmDialog` is dressed.
 *
 * Most confirms stand in front of something being taken away, and wear the
 * danger colour. `brand` is for the ones that only put something back — asked
 * about because they change what a person can do, not because they are
 * dangerous.
 *
 * It sits in its own module rather than beside the dialog because the row
 * actions that choose a tone are plain data, compiled by the test project,
 * which cannot see through a `.tsx` file.
 */
export type ConfirmTone = 'danger' | 'brand'
