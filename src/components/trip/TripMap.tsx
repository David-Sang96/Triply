import { View } from "react-native";
import { WebView } from "react-native-webview";

export type MapPlace = {
  name: string;
  lat: number;
  lng: number;
  day: number;
};

// A Leaflet + OpenStreetMap map rendered inside a WebView (no API key, card-free,
// matching the Nominatim/OSM stack). Leaflet is loaded from its CDN, so the map
// needs network. Note: OSM's public tile server is fine for light/personal use;
// a production app should use a dedicated tile provider.
function buildHtml(places: MapPlace[]): string {
  // A place name containing "</script>" would otherwise close this script
  // block before the JSON is parsed — escape "<" so it stays inside the string.
  const data = JSON.stringify(places).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  .leaflet-container { background: #e5e7eb; font-family: sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var places = ${data};
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  var markers = [];
  places.forEach(function(p){
    var m = L.marker([p.lat, p.lng]).addTo(map);
    m.bindPopup('<b>' + esc(p.name) + '</b><br/>Day ' + p.day);
    markers.push(m);
  });
  if (markers.length === 1) {
    map.setView(markers[0].getLatLng(), 14);
  } else if (markers.length > 1) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.3));
  } else {
    map.setView([20, 0], 2);
  }
</script>
</body>
</html>`;
}

export function TripMap({ places }: { places: MapPlace[] }) {
  const html = buildHtml(places);

  return (
    <View className="h-[220px] w-full overflow-hidden rounded-2xl border border-line bg-line">
      {/* Claim the touch gesture so panning the map doesn't scroll the page. */}
      <View style={{ flex: 1 }} onStartShouldSetResponder={() => true}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={{ flex: 1, backgroundColor: "transparent" }}
          scrollEnabled={false}
          nestedScrollEnabled
        />
      </View>
    </View>
  );
}
