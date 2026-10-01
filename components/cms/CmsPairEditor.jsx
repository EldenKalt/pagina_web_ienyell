'use client';

export default function CmsPairEditor({
  items = [],
  onChange,
  keys = ['value', 'label'],
  placeholders = ['Value', 'Label'],
}) {
  const update = (index, key, value) => {
    const next = items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    ));
    onChange(next);
  };

  const add = () => onChange([
    ...items,
    Object.fromEntries(keys.map((key) => [key, ''])),
  ]);

  const remove = (index) => onChange(
    items.filter((_, itemIndex) => itemIndex !== index),
  );

  return (
    <div className="cms-pair-editor">
      {items.map((item, index) => (
        <div key={index} className="cms-pair-row">
          {keys.map((key, keyIndex) => (
            <input
              key={key}
              type="text"
              value={item[key] || ''}
              placeholder={placeholders[keyIndex] || key}
              onChange={(event) => update(index, key, event.target.value)}
              className="cms-input"
            />
          ))}
          <button
            type="button"
            className="cms-pair-remove"
            onClick={() => remove(index)}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="cms-btn-add" onClick={add}>
        + Add
      </button>
    </div>
  );
}
