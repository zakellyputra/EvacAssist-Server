export default function ConfirmationDialog({ title, description, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-copy">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Keep Group
          </button>
          <button type="button" className="button button-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
