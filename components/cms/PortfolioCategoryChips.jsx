'use client';

export default function PortfolioCategoryChips({
  categories = [],
  value = [],
  onChange,
}) {
  const toggle = (slug) => {
    onChange(
      value.includes(slug)
        ? value.filter((categorySlug) => categorySlug !== slug)
        : [...value, slug],
    );
  };

  return (
    <div className="cms-category-chips">
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          className={`cms-category-chip${value.includes(category.slug) ? ' active' : ''}`}
          onClick={() => toggle(category.slug)}
        >
          {category.label}
        </button>
      ))}
      {!categories.length && (
        <span className="cms-no-data">No categories available</span>
      )}
    </div>
  );
}
