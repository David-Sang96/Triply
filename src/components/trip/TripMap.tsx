import { Linking, View } from "react-native";
import { WebView } from "react-native-webview";

export type MapPlace = {
  name: string;
  lat: number;
  lng: number;
  day: number;
};

// Tile source.
//
// OpenStreetMap's public tile server is licensed for light and personal use
// only — it is explicitly not for production traffic — so it is the *fallback*
// here, used when no MapTiler key is configured (a fresh clone, or a developer
// who has not filled in `.env`). Real builds set EXPO_PUBLIC_MAPTILER_KEY and
// get MapTiler, whose free tier covers roughly 100k tile requests a month.
//
// The key is an EXPO_PUBLIC_ variable, so it is bundled into the app and can be
// read by anyone who unpacks it. That is unavoidable for a client-rendered map:
// proxying tiles through our own Worker would keep it secret but would spend a
// Cloudflare subrequest per tile, which is a budget we already watch. The
// exposure is survivable — the worst case is somebody burning the monthly quota
// and the map going blank until the key is rotated in the MapTiler dashboard.
//
// `{r}` is Leaflet's retina placeholder: it becomes "@2x" on high-density
// screens (every phone), which is the same number of requests for a sharper
// tile. `detectRetina` is deliberately left off — that option doubles the
// request count as well.
const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

// Attribution is a licence condition, not decoration: MapTiler and OSM both
// require the credit to stay visible. `attributionControl` is on below.
const TILES = MAPTILER_KEY
  ? {
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}{r}.png?key=${MAPTILER_KEY}`,
      attribution:
        '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap contributors</a>',
    }
  : {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '<a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap contributors</a>',
    };

// A Leaflet map rendered inside a WebView. Leaflet is loaded from its CDN, so
// the map needs network.
function buildHtml(places: MapPlace[]): string {
  // A place name containing "</script>" would otherwise close this script
  // block before the JSON is parsed — escape "<" so it stays inside the string.
  // The tile config goes through the same escaping: its attribution is HTML,
  // and the key comes from the environment rather than from this file.
  const data = JSON.stringify(places).replace(/</g, "\\u003c");
  const tiles = JSON.stringify(TILES).replace(/</g, "\\u003c");
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
  var tiles = ${tiles};
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer(tiles.url, {
    maxZoom: 19,
    attribution: tiles.attribution
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
          // The attribution credits are links, and both licences expect them to
          // lead somewhere. Inside a WebView they would do nothing, so hand any
          // top-level navigation to the system browser instead. This fires for
          // frame navigations only — tile images and the Leaflet script are
          // subresources and are not affected.
          onShouldStartLoadWithRequest={(req) => {
            if (/^https?:/i.test(req.url)) {
              Linking.openURL(req.url).catch(() => {});
              return false;
            }
            return true;
          }}
        />
      </View>
    </View>
  );
}
