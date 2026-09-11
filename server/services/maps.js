const demoFacilities = [
  { name: 'City Emergency Centre', type: 'Emergency department · Open 24/7', distance: '2.4 km', phone: '112', address: 'Nearby emergency care', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=emergency+hospital' },
  { name: 'Community Health Clinic', type: 'Primary care · Appointments', distance: '3.1 km', phone: '', address: 'Nearby primary care', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=clinic' }
];

export async function findFacilities({ lat, lng, type = 'hospital' }) {
  if (!process.env.GOOGLE_MAPS_API_KEY || !lat || !lng) return demoFacilities;
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.search = new URLSearchParams({ location: `${lat},${lng}`, radius: '8000', type, key: process.env.GOOGLE_MAPS_API_KEY });
  const response = await fetch(url);
  if (!response.ok) return demoFacilities;
  const data = await response.json();
  return (data.results || []).slice(0, 5).map((place) => ({
    name: place.name, type: place.types?.includes('hospital') ? 'Hospital' : 'Healthcare facility', distance: 'Nearby', phone: '',
    address: place.vicinity || '', mapsUrl: `https://www.google.com/maps/search/?api=1&query_place_id=${place.place_id}&query=${encodeURIComponent(place.name)}`
  }));
}
