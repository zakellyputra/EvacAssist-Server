export default function FilterBar({ searchValue, onSearchChange, children }) {
  return (
    <div className="filter-bar">
      <input
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search records"
        aria-label="Search records"
      />
      <div className="filter-bar-controls">{children}</div>
    </div>
  );
}
