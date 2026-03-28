export function formatTimestamp(value) {
  if (!value) return 'Unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatShortId(value) {
  if (!value) return 'Unavailable';
  return value.length > 8 ? value.slice(-8) : value;
}

export function formatFallback(value, fallback = 'Unavailable') {
  return value == null || value === '' ? fallback : value;
}

export function formatLocationLabel(location) {
  if (!location) return 'Location unavailable';
  if (location.label) return location.label;
  if (location.coordinates?.length === 2) {
    return `${location.coordinates[1].toFixed(4)}, ${location.coordinates[0].toFixed(4)}`;
  }
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
  return 'Location unavailable';
}

export function formatOccupancy(currentOccupancy, capacity) {
  if (typeof currentOccupancy !== 'number' || typeof capacity !== 'number' || capacity <= 0) {
    return 'Unavailable';
  }

  const percentage = Math.round((currentOccupancy / capacity) * 100);
  return `${currentOccupancy}/${capacity} (${percentage}%)`;
}
