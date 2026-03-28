export default function LoadingState({ label = 'Loading data...' }) {
  return (
    <div className="loading-state" aria-live="polite">
      <span className="loading-dot" />
      <span>{label}</span>
    </div>
  );
}
