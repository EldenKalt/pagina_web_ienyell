'use client';

/** Archive pagination. Moved verbatim from app/blog/page.js. */
export default function BlogPagination({ page, totalPages, onPageChange }) {
  if (page <= 1 && page >= totalPages) return null;

  return (
    <div className="blog-pagination">
      <button
        type="button"
        className="blog-pagination-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button
        type="button"
        className="blog-pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
