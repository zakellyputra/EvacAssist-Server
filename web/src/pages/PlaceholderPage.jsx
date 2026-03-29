import Panel from '../components/Panel';

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="dashboard-page">
      <Panel title={title} subtitle={description}>
        <div className="placeholder-page">
          <strong>{title} workspace is intentionally reserved.</strong>
          <p>
            This area is present in navigation so the admin board already reflects the eventual
            operational structure, even before the next set of workflows is connected.
          </p>
        </div>
      </Panel>
    </div>
  );
}
