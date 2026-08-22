import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { colors, shadows } from "@/theme/colors";

export type MapPlace = {
  name: string;
  lat: number;
  lng: number;
  day: number;
};

// A single place the itinerary has asked the map to zoom to. `key` is the
// activity id, not the name: the same place can appear on two days, and the
// caller needs to know which row is currently active so tapping it again can
// clear it.
export type MapFocus = {
  key: string;
  lat: number;
  lng: number;
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
// read by anyone who unpacks it. Hiding it is not an option — proxying tiles
// through our own Worker would spend a Cloudflare subrequest per tile, a budget
// we already watch. So the key is *restricted* instead of hidden: MapTiler can
// refuse any request whose User-Agent does not contain a chosen substring, and
// TILE_USER_AGENT below is what this app appends to the WebView's agent.
//
// That turns a stolen key from "burn my quota" into "only works if you also
// forge the header", which is not real security — a determined person can set
// any User-Agent — but it does stop the casual copy-paste case, which is the
// realistic one. Rotate the key in the MapTiler dashboard if the quota ever
// moves without the users to explain it.
//
// Do NOT also fill in MapTiler's "Allowed HTTP Origins": Leaflet loads tiles as
// plain <img> elements, which send no Origin header, and MapTiler rejects
// "unknown" origins as soon as that list is non-empty. It would blank the map.
const TILE_USER_AGENT = "TriplyApp/1.0";
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
      // .webp, not .png — measured on a central-Paris tile at z12: 141 KB
      // against 268 KB for the same tile as PNG, with no visible difference.
      // A map view pulls roughly eight tiles, so that is about 1 MB saved every
      // time someone opens a trip. WebP is safe on both targets (Android
      // WebView has supported it throughout; WKWebView since iOS 14, and SDK 57
      // requires 15.1).
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}{r}.webp?key=${MAPTILER_KEY}`,
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
  // Pixels to push the focused pin below centre, sized from the parts above it:
  // a 41px marker plus a two-line popup and its tip. With MAP_HEIGHT 220 this
  // puts the pin ~165px down, leaving the bubble clear of the top edge.
  var POPUP_HEADROOM = 55;
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
    // autoPan off, and __focus below positions the map instead. Leaflet's
    // auto-pan fights the zoom animation in a box this small: it measures
    // against a mid-animation viewport and drags the popup off to one side.
    // maxWidth keeps a long place name from running past the edges.
    m.bindPopup('<b>' + esc(p.name) + '</b><br/>Day ' + p.day, {
      autoPan: false,
      maxWidth: 200
    });
    markers.push(m);
  });

  // Both view states live in functions so React Native can drive them with
  // injectJavaScript. Rebuilding this HTML instead would remount the WebView
  // and re-download every tile, which is the whole reason the map is imperative
  // here rather than a prop.
  window.__showAll = function(){
    map.closePopup();
    if (markers.length === 1) {
      map.setView(markers[0].getLatLng(), 14);
    } else if (markers.length > 1) {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.3));
    } else {
      map.setView([20, 0], 2);
    }
  };

  // Matched on coordinates rather than name: two activities can share a place
  // name, and the coordinates are what actually identify a marker. Nearest
  // wins, so tiny float differences between the row and the marker are fine.
  window.__focus = function(lat, lng){
    var target = null, best = Infinity;
    markers.forEach(function(m){
      var ll = m.getLatLng();
      var d = Math.abs(ll.lat - lat) + Math.abs(ll.lng - lng);
      if (d < best) { best = d; target = m; }
    });
    if (!target) return;
    var z = 16;
    // Do NOT centre the marker. The popup opens upward and this map is only
    // 220px tall, so a centred pin leaves ~110px of headroom and the bubble
    // gets clipped by the top edge. Shift the centre up in *pixel* space so
    // the pin sits in the lower half with the popup fully above it.
    // Projected y grows downward, so subtracting moves the centre up.
    var pt = map.project(target.getLatLng(), z).subtract([0, POPUP_HEADROOM]);
    map.setView(map.unproject(pt, z), z, { animate: true });
    target.openPopup();
  };

  window.__showAll();
</script>
</body>
</html>`;
}

export function TripMap({
  places,
  focus = null,
  onShowAll,
}: {
  places: MapPlace[];
  // Set by the itinerary when a place row is tapped; null means "whole trip".
  focus?: MapFocus | null;
  onShowAll?: () => void;
}) {
  const html = buildHtml(places);
  const webRef = useRef<WebView>(null);
  // The page has to finish loading before window.__focus exists. A tap can
  // arrive first on a slow connection, so the effect re-runs on this too and
  // applies whatever focus was pending.
  const readyRef = useRef(false);

  useEffect(() => {
    if (!readyRef.current) return;
    const js = focus
      ? `window.__focus && window.__focus(${focus.lat}, ${focus.lng}); true;`
      : `window.__showAll && window.__showAll(); true;`;
    webRef.current?.injectJavaScript(js);
  }, [focus]);

  return (
    <View className="h-[220px] w-full overflow-hidden rounded-2xl border border-line bg-line">
      {/* Claim the touch gesture so panning the map doesn't scroll the page. */}
      <View style={{ flex: 1 }} onStartShouldSetResponder={() => true}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html }}
          onLoadEnd={() => {
            readyRef.current = true;
            if (focus) {
              webRef.current?.injectJavaScript(
                `window.__focus && window.__focus(${focus.lat}, ${focus.lng}); true;`,
              );
            }
          }}
          style={{ flex: 1, backgroundColor: "transparent" }}
          scrollEnabled={false}
          nestedScrollEnabled
          // Appended to the WebView's own user agent (not a replacement — that
          // is the `userAgent` prop, and overriding the whole string can change
          // what a CDN serves). Every request the page makes carries it, tile
          // images included, which is what lets the MapTiler key be locked to
          // this app. Shared prop: applies on Android and iOS alike.
          applicationNameForUserAgent={TILE_USER_AGENT}
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

      {/* Rendered in React Native rather than inside the page: it has to sit
          above the WebView, follow the app's fonts and colours, and keep
          working even if Leaflet fails to load from its CDN. */}
      {focus && onShowAll ? (
        <Pressable
          onPress={onShowAll}
          hitSlop={6}
          className="absolute left-2 top-2 flex-row items-center rounded-full border border-line bg-surface px-3 py-1.5 active:opacity-80"
          style={shadows.sm}
        >
          <Ionicons name="contract-outline" size={13} color={colors.brand} />
          <Text className="ml-1.5 font-psemibold text-[12px] text-ink">
            Show all places
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
