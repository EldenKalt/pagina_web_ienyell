'use client';

export default function CmsRelatedSelector({
  label = 'items',
  selectedIds = [],
  onChange,
  items = [],
}) {
  const toggle = (id) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  };

  if (!items.length) {
    return <p className="cms-no-data">No {label} available</p>;
  }

  return (
    <div className="cms-related-selector">
      {items.map((item) => (
        <label key={item.id} className="cms-related-item">
          <input
            type="checkbox"
            checked={selectedIds.includes(item.id)}
            onChange={() => toggle(item.id)}
          />
          <span>{item.title || item.name}</span>
        </label>
      ))}
    </div>
  );
}
