function SearchBar({ value, onChange, placeholder = 'Search funds...' }) {
  return (
    <input
      type="text"
      className="search-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default SearchBar;
