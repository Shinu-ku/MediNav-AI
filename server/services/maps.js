const typeMap = { hospital: 'hospital', doctor: 'doctor', clinic: 'medical_clinic', pharmacy: 'pharmacy', lab: 'diagnostic_center', diagnostic: 'diagnostic_center', emergency: 'hospital', 'emergency department': 'hospital' };
const distance = (a, b, c, d) => { const r = (v) => v * Math.PI / 180; const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return `${(6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))).toFixed(1)} km`; };

export async function findFacilities({ lat, lng, type = 'hospital' }) {
  const latitude = Number(lat); const longitude = Number(lng);
  if (!process.env.GOOGLE_MAPS_API_KEY) throw new Error('Google Places is not configured.');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Current location is required to find nearby care.');
  // Places API (New). Enable "Places API (New)" for the server-side key.
  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.primaryType,places.nationalPhoneNumber,places.googleMapsUri,places.location,places.rating,places.regularOpeningHours.openNow' },
    body: JSON.stringify({ includedTypes: [typeMap[String(type).toLowerCase()] || 'hospital'], maxResultCount: 5, locationRestriction: { circle: { center: { latitude, longitude }, radius: 8000 } } })
  });
  if (!response.ok) throw new Error('Nearby care search is unavailable.');
  const data = await response.json();
  const places = (data.places || []).map((place) => ({
    name: place.displayName?.text || 'Unnamed healthcare facility', type: place.primaryType || 'Healthcare facility', distance: place.location ? distance(latitude, longitude, place.location.latitude, place.location.longitude) : '', phone: place.nationalPhoneNumber || '',
    address: place.formattedAddress || '', mapsUrl: place.googleMapsUri || '', rating: place.rating ?? null, openNow: place.regularOpeningHours?.openNow ?? null
  }));
  return places;
}
