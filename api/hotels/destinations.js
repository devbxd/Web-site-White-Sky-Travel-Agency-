const { hasApiKey, liteApiGet } = require("../_lib/liteapi");

/* Demo suggestions used until LITEAPI_KEY is configured. */
const DEMO_PLACES = [
  { label: "Beirut, Lebanon", country: "Lebanon", placeId: "" },
  { label: "Kuwait City, Kuwait", country: "Kuwait", placeId: "" },
  { label: "Dubai, United Arab Emirates", country: "United Arab Emirates", placeId: "" },
  { label: "Istanbul, Turkey", country: "Turkey", placeId: "" },
  { label: "Paris, France", country: "France", placeId: "" },
  { label: "London, United Kingdom", country: "United Kingdom", placeId: "" },
  { label: "Cairo, Egypt", country: "Egypt", placeId: "" },
  { label: "Doha, Qatar", country: "Qatar", placeId: "" }
];

module.exports = async function handler(req, res) {
  const q = (req.query.q || "").toString().trim();
  if (!q) { res.status(200).json({ results: [] }); return; }

  if (!hasApiKey()) {
    const matches = DEMO_PLACES.filter(function (p) {
      return p.label.toLowerCase().indexOf(q.toLowerCase()) !== -1;
    });
    res.status(200).json({ results: matches, demo: true });
    return;
  }

  try {
    const data = await liteApiGet("/data/places", { textQuery: q, type: "locality" });
    const results = (data.data || []).map(function (p) {
      return {
        label: p.displayName,
        country: p.formattedAddress || "",
        placeId: p.placeId
      };
    });
    res.status(200).json({ results: results });
  } catch (err) {
    res.status(200).json({ results: [], error: "destinations_lookup_failed" });
  }
};
