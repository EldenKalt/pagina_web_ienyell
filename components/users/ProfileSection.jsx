/**
 * One block of the profile: a heading, how many things are in it, and the things.
 *
 * The profile is a stack of lists that have nothing structurally in common, so
 * the only thing worth sharing is the frame around them — the heading level, the
 * count, the empty state, and the note that marks a section as not yet wired to
 * anything.
 */
export default function ProfileSection({
  id,
  title,
  count,
  countLabel,
  description,
  empty = 'Nothing here yet.',
  note,
  children,
}) {
  const isEmpty = typeof count === 'number' && count === 0;

  return (
    <section className="profile-section" aria-labelledby={id}>
      <div className="profile-section-head">
        <h2 className="profile-section-title" id={id}>
          {title}
        </h2>
        {typeof count === 'number' ? (
          <p className="profile-section-count">
            {count} {countLabel || (count === 1 ? 'item' : 'items')}
          </p>
        ) : null}
      </div>

      {description ? <p className="profile-section-description">{description}</p> : null}

      {/* Optional explanatory note for sections still awaiting their own backend. */}
      {note ? <p className="profile-section-note">{note}</p> : null}

      {isEmpty ? <p className="profile-empty">{empty}</p> : children}
    </section>
  );
}
