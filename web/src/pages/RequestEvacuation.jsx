import { useState } from 'react';
import { createEvacuationRequest } from '../riderApi';

export default function RequestEvacuation() {
  const [passengers, setPassengers] = useState('1');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('');
  const [notes, setNotes] = useState('');
  const [locationLabel, setLocationLabel] = useState('Not captured yet');
  const [pickupLoc, setPickupLoc] = useState(null);
  const [requestResult, setRequestResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getCurrentLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = Number(position.coords.longitude);
        const lat = Number(position.coords.latitude);
        setPickupLoc({
          type: 'Point',
          coordinates: [lng, lat],
        });
        setLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      },
      () => {
        setError('Unable to read your location. Allow location access and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setRequestResult(null);

    if (!pickupLoc) {
      setError('Capture your location first.');
      return;
    }

    setLoading(true);
    try {
      const result = await createEvacuationRequest({
        pickupLoc,
        passengers: passengers === '5+' ? 5 : Number(passengers),
        accessibilityNeeds: accessibilityNeeds || undefined,
        notes: notes || undefined,
      });
      setRequestResult(result);
    } catch (err) {
      setError(err.message || 'Unable to submit evacuation request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="request-page">
      <div className="request-card">
        <h1>Request Evacuation</h1>
        <p>Your request is saved to the live evacuation database and dispatched to drivers.</p>

        {error && <div className="error">{error}</div>}
        {requestResult && (
          <div className="success">
            <div><strong>Request submitted.</strong></div>
            <div>Trip ID: {requestResult.tripId}</div>
            <div>Status: {requestResult.status}</div>
            <div>Pickup QR token: {requestResult.qrToken}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Pickup Location</label>
            <button type="button" className="btn btn-secondary" onClick={getCurrentLocation}>
              Use Current Location
            </button>
            <div className="location-label">{locationLabel}</div>
          </div>

          <div className="form-group">
            <label>Passengers</label>
            <select value={passengers} onChange={(event) => setPassengers(event.target.value)}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5+">5+</option>
            </select>
          </div>

          <div className="form-group">
            <label>Accessibility Needs (optional)</label>
            <input
              type="text"
              value={accessibilityNeeds}
              onChange={(event) => setAccessibilityNeeds(event.target.value)}
              placeholder="Wheelchair, medical support, etc."
            />
          </div>

          <div className="form-group">
            <label>Notes for Driver (optional)</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Landmarks, gate codes, special pickup notes."
            />
          </div>

          <button type="submit" className="btn btn-primary request-submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Evacuation Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
