import { useState, useEffect, useCallback } from 'react';
import { getFunds, getCategories } from '../services/api';
import SearchBar from '../components/SearchBar';
import FundCard from '../components/FundCard';
import Pagination from '../components/Pagination';

function Home() {
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFunds({ search, category, page, limit: 12 });
      setFunds(data.funds);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError('Failed to load funds. Please try again.');
      console.error('Error fetching funds:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchFunds();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchFunds]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  return (
    <div className="container">
      <section className="search-section">
        <div className="search-row">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by fund name..."
          />
          <select
            className="category-select"
            value={category}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading funds...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && funds.length === 0 && (
        <div className="empty-state">
          <p>No funds found. Try adjusting your search.</p>
        </div>
      )}

      {!loading && !error && funds.length > 0 && (
        <>
          <div className="funds-grid">
            {funds.map((fund) => (
              <FundCard key={fund.scheme_code} fund={fund} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Home;
