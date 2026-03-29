export default function SearchInput({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="search-input">
      <span className="search-input-label">Search</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
