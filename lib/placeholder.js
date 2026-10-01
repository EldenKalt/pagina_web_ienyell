/**
 * Marks a value on screen as invented placeholder data.
 *
 * The numbers across the post template — reaction counts, readers, followers —
 * are plausible on purpose: a layout has to be judged against values of
 * different widths, and `{qt_favs}` everywhere would hide that 1.4k and 12 sit
 * very differently in a row. The cost of plausible numbers is that they read as
 * real, so every one of them carries a marker naming the field it stands in for.
 *
 * Development only. `process.env.NODE_ENV` is inlined at build time, so in a
 * production build the attribute is never rendered and no styling, markup or
 * runtime work ships — there is nothing to remember to turn off.
 *
 * Usage:
 *   <span {...placeholderAttrs('post.stats.likes')}>537</span>
 */
export function placeholderAttrs(field) {
  if (process.env.NODE_ENV === 'production') return null;
  return { 'data-placeholder': field };
}
