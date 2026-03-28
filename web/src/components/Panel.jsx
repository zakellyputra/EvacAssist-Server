export default function Panel({ title, subtitle, actions = null, children, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || subtitle || actions) ? (
        <div className="panel-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="panel-body">{children}</div>
    </section>
  );
}
