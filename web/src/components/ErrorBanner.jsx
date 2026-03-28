export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <strong>Unable to load all data.</strong>
      <span>{message}</span>
    </div>
  );
}
