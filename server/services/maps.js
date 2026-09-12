const demoFacilities = [
  { name: 'City Emergency Centre', type: 'Emergency department · Open 24/7', distance: '2.4 km', phone: '112', address: 'Nearby emergency care', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=emergency+hospital' },
  { name: 'Community Health Clinic', type: 'Primary care · Appointments', distance: '3.1 km', phone: '', address: 'Nearby primary care', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=clinic' }
];

export async function findFacilities({ lat, lng, type = 'hospital' }) {
  if (!process.env.GOOGLE_MAPS_API_KEY || !lat || !lng) return demoFacilities;
  // Places API (New). Enable "Places API (New)" for the server-side key.
  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.primaryType,places.nationalPhoneNumber,places.googleMapsUri' },
    body: JSON.stringify({ includedTypes: [type], maxResultCount: 5, locationRestriction: { circle: { center: { latitude: Number(lat), longitude: Number(lng) }, radius: 8000 } } })
  });
  if (!response.ok) return demoFacilities;
  const data = await response.json();
  const places = (data.places || []).map((place) => ({
    name: place.displayName?.text || 'Healthcare facility', type: place.primaryType === 'hospital' ? 'Hospital' : 'Healthcare facility', distance: 'Nearby', phone: place.nationalPhoneNumber || '',
    address: place.formattedAddress || '', mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || 'hospital')}`
  }));
  return places.length ? places : demoFacilities;
}
