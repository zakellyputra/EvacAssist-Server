export default function Panel({ title, subtitle, actions = null, children, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || subtitle || actions) ? (
        <header className="panel-header">
          <div className="panel-heading">
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="panel-body">{children}</div>
    </section>
  );
}
