// Unicode bidi isolates. FSI/LRI/PDI keep an embedded LTR run (a unit number
// like "A-12", a building code) in its own order when it sits inside an Arabic
// sentence, without affecting the text around it.
const LRI = '⁦';
const PDI = '⁩';

/** Wrap a value that must always read left-to-right inside translated copy. */
export function ltr(value: string | number): string {
  return `${LRI}${String(value)}${PDI}`;
}
