'use client';

import { useState } from 'react';
import { addWishlistProduct, profileError, removeWishlistProduct, searchWishlistProducts } from '../../lib/readerProfile';
import ProfileWishlist from './ProfileWishlist';

export default function ProfileWishlistManager({ items, onChanged }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const search = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true); setError('');
    try { setResults((await searchWishlistProducts(query.trim())).products); }
    catch (failure) { setError(profileError(failure)); }
    finally { setSearching(false); }
  };
  const change = async (id, add) => {
    setBusyId(id); setError('');
    try {
      if (add) await addWishlistProduct(id);
      else await removeWishlistProduct(id);
      if (add) setResults((current) => current.map((product) => product.id === id ? { ...product, saved: true } : product));
      else setResults((current) => current.map((product) => product.id === id ? { ...product, saved: false } : product));
      onChanged();
    } catch (failure) { setError(profileError(failure)); }
    finally { setBusyId(null); }
  };
  const savedIds = new Set(items.map((item) => item.id));
  return <div className="profile-wishlist-manager">
    <form onSubmit={search} className="profile-wishlist-search">
      <label htmlFor="profile-wishlist-query">Find a product</label>
      <div><input id="profile-wishlist-query" value={query} maxLength={80} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" />
        <button type="submit" disabled={searching || query.trim().length < 2}>{searching ? 'Searching…' : 'Search'}</button></div>
    </form>
    {error && <p className="blog-public-error" role="alert">{error}</p>}
    {results.length > 0 && <ul className="profile-wishlist-results">{results.map((product) => <li key={product.id}>
      <span>{product.title} · ₡{new Intl.NumberFormat('es-CR').format(Number(product.price))}</span>
      <button type="button" disabled={product.saved || savedIds.has(product.id) || busyId === product.id} onClick={() => change(product.id, true)}>
        {product.saved || savedIds.has(product.id) ? 'Saved' : busyId === product.id ? 'Adding…' : 'Add to wishlist'}
      </button>
    </li>)}</ul>}
    <ProfileWishlist items={items} onRemove={(id) => change(id, false)} busyId={busyId} />
  </div>;
}
