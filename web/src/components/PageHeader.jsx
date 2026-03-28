export default function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">Operations</p>
        <h2>{title}</h2>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
