import MapCanvas from '../components/MapCanvas';
import MapDetailPanel from '../components/MapDetailPanel';
import MapFilterBar from '../components/MapFilterBar';
import MapLegend from '../components/MapLegend';
import Panel from '../components/Panel';
import SummaryStrip from '../components/SummaryStrip';
import { useOperations } from '../operations';

export default function LiveMapPage() {
  const {
    liveMapBase,
    liveMapData,
    liveMapSummaries,
    mapFilters,
    setMapFilters,
    selectedMapItem,
    selectedMapItemData,
    selectMapItem,
  } = useOperations();

  const zones = ['All', ...new Set(liveMapBase.pickupPoints.map((item) => item.zone))];
  const statuses = ['All', 'Open', 'Filling', 'Full', 'En Route', 'Flagged', 'Critical', 'Warning', 'Monitoring', 'Resolved'];

  return (
    <div className="dashboard-page">
      <SummaryStrip items={liveMapSummaries} />

      <section className="live-map-layout">
        <Panel
          title="Live Map"
          subtitle="Monitor active ride groups, pickup points, driver movement, and restricted corridors across the current response area."
          className="live-map-panel"
        >
          <div className="live-map-panel-body">
            <MapFilterBar filters={mapFilters} onChange={setMapFilters} zones={zones} statuses={statuses} />
            <MapCanvas data={liveMapData} selectedMapItem={selectedMapItem ?? selectedMapItemData} onSelect={selectMapItem} />
            <MapLegend />
          </div>
        </Panel>

        <MapDetailPanel selected={selectedMapItemData} />
      </section>
    </div>
  );
}
