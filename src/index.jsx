import React, { useEffect, useState } from "react";

/**
 * BookFinder.jsx
 * Single-file React component (default export) for a student-friendly book search app.
 * - Uses Open Library Search API (https://openlibrary.org/search.json)
 * - Features: title/author/isbn search, subject filter, year filter, pagination,
 *   sort, cover images, book detail modal, favorites (localStorage), keyboard shortcuts
 * - Styling: Tailwind utility classes
 * - Notes: Drop into a Create React App / Vite app. Tailwind should be available.
 *
 * How to use:
 * 1. Place this file in your React project (e.g. src/components/BookFinder.jsx)
 * 2. Import and render <BookFinder /> in your app.
 * 3. Ensure Tailwind is configured, or replace classNames with your own CSS.
 */

export default function BookFinder() {
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [results, setResults] = useState([]);
  const [numFound, setNumFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bf_favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [sortBy, setSortBy] = useState("relevance");

  // Build search query string for Open Library
  function buildQueryString() {
    const parts = [];
    if (title) parts.push(`title:${title}`);
    if (author) parts.push(`author:${author}`);
    if (isbn) parts.push(`isbn:${isbn}`);
    if (subject) parts.push(`subject:${subject}`);
    if (year) parts.push(`first_publish_year:${year}`);
    // fallback: if user typed free text
    if (!parts.length && query) parts.push(query);
    return parts.join(" ");
  }

  async function searchBooks(newPage = 1) {
    setLoading(true);
    setError("");
    const q = encodeURIComponent(buildQueryString());
    if (!q) {
      setResults([]);
      setNumFound(0);
      setLoading(false);
      return;
    }

    const url = `https://openlibrary.org/search.json?q=${q}&page=${newPage}&limit=${limit}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      let docs = data.docs || [];

      // Sort client-side for a couple simple options
      if (sortBy === "newest") docs = docs.sort((a, b) => (b.first_publish_year || 0) - (a.first_publish_year || 0));
      else if (sortBy === "oldest") docs = docs.sort((a, b) => (a.first_publish_year || 0) - (b.first_publish_year || 0));

      setResults(docs);
      setNumFound(data.numFound || 0);
      setPage(newPage);
    } catch (e) {
      console.error(e);
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function coverUrl(doc, size = "L") {
    if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-${size}.jpg`;
    // fallback: try ISBN
    if (doc.isbn && doc.isbn.length) return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-${size}.jpg`;
    return null;
  }

  function toggleFavorite(doc) {
    const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0] || doc.title;
    const exists = favorites.find((f) => f.key === key);
    let next;
    if (exists) next = favorites.filter((f) => f.key !== key);
    else next = [{ key, doc }, ...favorites].slice(0, 100);
    setFavorites(next);
    localStorage.setItem("bf_favorites", JSON.stringify(next));
  }

  function isFavorite(doc) {
    const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0] || doc.title;
    return favorites.some((f) => f.key === key);
  }

  // keyboard shortcuts: Enter for search, / to focus quick search
  useEffect(() => {
    function onKey(e) {
      if (e.key === "/") {
        e.preventDefault();
        const el = document.getElementById("quick-search");
        if (el) el.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // quick search when query changes (optional: throttle)
  useEffect(() => {
    const handler = setTimeout(() => {
      // only run if query typed (not structured fields)
      if (query && !title && !author && !isbn && !subject && !year) {
        searchBooks(1);
      }
    }, 550);
    return () => clearTimeout(handler);
  }, [query]);

  // small helper to open Open Library page
  function openOL(doc) {
    const id = doc.key || doc.cover_edition_key || (doc.edition_key && doc.edition_key[0]);
    if (!id) return;
    const url = id.startsWith("/") ? `https://openlibrary.org${id}` : `https://openlibrary.org${id}`;
    window.open(url, "_blank");
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">BookFinder</h1>
          <p className="text-sm text-muted-foreground">Search books from Open Library — quick, student-friendly, and free. Press <kbd className="px-1 py-0.5 border rounded">/</kbd> to focus search.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // quick demo search
              setTitle("");
              setAuthor("");
              setQuery("harry potter");
              searchBooks(1);
            }}
            className="px-3 py-1 rounded shadow-sm hover:shadow">
            Demo
          </button>
          <button
            onClick={() => {
              // show favorites in results
              setResults(favorites.map((f) => f.doc));
              setNumFound(favorites.length);
            }}
            className="px-3 py-1 rounded border">
            Favorites ({favorites.length})
          </button>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          searchBooks(1);
        }}
        className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Quick / Full-text</label>
          <input
            id="quick-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any keyword (press Enter to search)"
            className="w-full p-2 rounded border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exact or partial title" className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block text-sm font-medium">Author</label>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block text-sm font-medium">ISBN</label>
          <input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="ISBN number" className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block text-sm font-medium">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. fantasy, databases" className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block text-sm font-medium">Year</label>
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="first publish year" className="w-full p-2 rounded border" />
        </div>

        <div className="md:col-span-1 flex items-end gap-2">
          <button type="submit" className="px-4 py-2 rounded bg-emerald-500 text-white">Search</button>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTitle("");
              setAuthor("");
              setIsbn("");
              setSubject("");
              setYear("");
              setResults([]);
              setNumFound(0);
            }}
            className="px-4 py-2 rounded border">
            Clear
          </button>
        </div>

        <div className="md:col-span-4 flex items-center gap-3">
          <label className="text-sm">Sort</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 rounded border">
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>

          <div className="ml-auto text-sm text-muted-foreground">Results: {numFound.toLocaleString()}</div>
        </div>
      </form>

      {error && <div className="mb-4 text-red-600">Error: {error}</div>}

      <main>
        {loading ? (
          <div className="py-20 text-center">Loading…</div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No results. Try a different search.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((doc) => (
              <article key={doc.key || doc.cover_edition_key || doc.title} className="p-3 border rounded shadow-sm flex gap-3">
                <div className="w-28 flex-shrink-0">
                  {coverUrl(doc) ? (
                    <img src={coverUrl(doc, "M")} alt={`${doc.title} cover`} className="w-28 h-40 object-cover rounded" />
                  ) : (
                    <div className="w-28 h-40 flex items-center justify-center rounded bg-gray-100 text-sm">No Cover</div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold">{doc.title}</h2>
                  <div className="text-sm text-muted-foreground">{(doc.author_name || []).slice(0, 3).join(", ")}</div>
                  <div className="mt-2 text-xs text-muted-foreground">First: {doc.first_publish_year || "—"} • Editions: {doc.edition_count || 0}</div>

                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => { setSelected(doc); }} className="px-2 py-1 rounded border text-sm">Details</button>
                    <button onClick={() => openOL(doc)} className="px-2 py-1 rounded border text-sm">OpenLibrary</button>
                    <button onClick={() => toggleFavorite(doc)} className="px-2 py-1 rounded border text-sm">{isFavorite(doc) ? 'Unfav' : 'Fav'}</button>
                    <div className="ml-auto text-xs text-muted-foreground">Type: {doc.type || doc.cover_edition_key ? 'Book' : 'Work'}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* pagination */}
        {numFound > limit && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => searchBooks(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 rounded border">Prev</button>
            <div>Page {page} • {Math.ceil(numFound / limit)} total</div>
            <button onClick={() => searchBooks(page + 1)} disabled={page * limit >= numFound} className="px-3 py-1 rounded border">Next</button>
          </div>
        )}
      </main>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)}></div>
          <div className="relative max-w-3xl w-full bg-white rounded p-4 shadow-lg">
            <div className="flex gap-4">
              <div className="w-40">
                {coverUrl(selected, "L") ? (
                  <img src={coverUrl(selected, "L")} alt="cover" className="w-40 h-56 object-cover rounded" />
                ) : (
                  <div className="w-40 h-56 flex items-center justify-center rounded bg-gray-100">No Cover</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{selected.title}</h3>
                <div className="text-sm text-muted-foreground">{(selected.author_name || []).join(", ")}</div>
                <p className="mt-2 text-sm">First published: {selected.first_publish_year || '—'}</p>
                <p className="mt-2 text-sm">Subjects: {(selected.subject || []).slice(0, 8).join(", ")}</p>

                <div className="mt-4 flex gap-2">
                  <button onClick={() => openOL(selected)} className="px-3 py-1 rounded border">Open on OpenLibrary</button>
                  <button onClick={() => { toggleFavorite(selected); }} className="px-3 py-1 rounded border">{isFavorite(selected) ? 'Remove Favorite' : 'Add Favorite'}</button>
                  <button onClick={() => setSelected(null)} className="ml-auto px-3 py-1 rounded border">Close</button>
                </div>

                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer">View raw details</summary>
                  <pre className="mt-2 max-h-44 overflow-auto text-xs bg-gray-50 p-2 rounded">{JSON.stringify(selected, null, 2)}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 text-sm text-muted-foreground">
        Built for Alex — College student workflow: search, save favorites, and open references. Uses Open Library Search API.
      </footer>
    </div>
  );
}
