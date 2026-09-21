const { hasApiKey, liteApiGet, liteApiPost } = require("../_lib/liteapi");

/* ---------- Demo data (used until LITEAPI_KEY is configured) ---------- */
function demoHotels(destination) {
  const label = destination || "your destination";
  return [
    { id: "demo-1", name: "Grand " + label + " Hotel", stars: 5, address: "Central district, " + label, price: 214, currency: "USD", board: "Breakfast Included", freeCancellation: true },
    { id: "demo-2", name: label + " Bay Resort", stars: 4, address: "Waterfront promenade, " + label, price: 156, currency: "USD", board: "Room Only", freeCancellation: true },
    { id: "demo-3", name: "The " + label + " Suites", stars: 4, address: "Business district, " + label, price: 132, currency: "USD", board: "Breakfast Included", freeCancellation: false },
    { id: "demo-4", name: label + " Garden Inn", stars: 3, address: "Old town, " + label, price: 89, currency: "USD", board: "Room Only", freeCancellation: true }
  ];
}

function boardLabel(rate) {
  return (rate && (rate.boardName || rate.boardType)) || "";
}

function isRefundable(rate) {
  if (!rate || !rate.cancellationPolicies) return false;
  const policies = Array.isArray(rate.cancellationPolicies)
    ? rate.cancellationPolicies
    : rate.cancellationPolicies.refundableTag ? [rate.cancellationPolicies] : [];
  if (rate.cancellationPolicies.refundableTag) return rate.cancellationPolicies.refundableTag === "RFN";
  return policies.some(function (p) { return p.refundableTag === "RFN"; });
}

function rateAmount(rate) {
  const total = rate && rate.retailRate && rate.retailRate.total;
  if (!total) return null;
  return Array.isArray(total) ? total[0] : total;
}

/* Each roomTypes[] entry is one bookable offer. When more than one room is
   requested, that offer's `rates` array holds one entry PER ROOM
   (occupancyNumber 1, 2, ...) — LiteAPI does not sum them for you, so the
   full price for the stay is the sum across that offer's rates, not the
   price of a single room in it. */
function offerTotal(rt) {
  let amount = 0;
  let currency = "USD";
  let board = "";
  let freeCancellation = true;
  let count = 0;
  (rt.rates || []).forEach(function (rate) {
    const amt = rateAmount(rate);
    if (!amt) return;
    count++;
    amount += amt.amount;
    currency = amt.currency || currency;
    if (!board) board = boardLabel(rate);
    if (!isRefundable(rate)) freeCancellation = false;
  });
  if (!count) return null;
  return { amount: amount, currency: currency, board: board, freeCancellation: freeCancellation };
}

function cheapestRate(hotel) {
  let best = null;
  (hotel.roomTypes || []).forEach(function (rt) {
    const offer = offerTotal(rt);
    if (!offer) return;
    if (!best || offer.amount < best.amount) best = offer;
  });
  return best;
}

module.exports = async function handler(req, res) {
  const q = req.query;
  const destination = (q.destination || "").toString().trim();
  const checkin = (q.checkin || "").toString();
  const checkout = (q.checkout || "").toString();
  const rooms = Math.max(1, parseInt(q.rooms, 10) || 1);
  const adults = Math.max(1, parseInt(q.adults, 10) || 2);
  const nationality = (q.nationality || "KW").toString();
  let placeId = (q.placeId || "").toString();

  if (!destination) {
    res.status(400).json({ error: "destination_required" });
    return;
  }

  if (!hasApiKey()) {
    res.status(200).json({ hotels: demoHotels(destination), demo: true });
    return;
  }

  try {
    if (!placeId) {
      const places = await liteApiGet("/data/places", { textQuery: destination, type: "locality" });
      const first = (places.data || [])[0];
      if (!first) { res.status(200).json({ hotels: [] }); return; }
      placeId = first.placeId;
    }

    const occupancies = [];
    for (let i = 0; i < rooms; i++) occupancies.push({ adults: adults });

    const data = await liteApiPost("/hotels/rates", {
      placeId: placeId,
      checkin: checkin,
      checkout: checkout,
      currency: "USD",
      guestNationality: nationality,
      occupancies: occupancies,
      maxRatesPerHotel: 5,
      includeHotelData: true
    });

    /* The rates endpoint returns pricing in `data` (keyed by hotelId) and
       hotel content (name/address/photos) separately in `hotels` — merge
       the two by id. */
    const infoById = {};
    (data.hotels || []).forEach(function (info) {
      infoById[info.id] = info;
    });

    const rawRates = data.data || [];
    const hotels = rawRates.map(function (hotel) {
      const rate = cheapestRate(hotel);
      const info = infoById[hotel.hotelId] || hotel.hotelData || {};
      return {
        id: hotel.hotelId,
        name: info.name || "Hotel",
        stars: info.stars || info.starRating || null,
        address: [info.address, info.city_name].filter(Boolean).join(", "),
        image: info.main_photo || info.thumbnail || null,
        price: rate ? rate.amount : null,
        currency: rate ? rate.currency : "USD",
        board: rate ? rate.board : "",
        freeCancellation: rate ? rate.freeCancellation : false
      };
    }).filter(function (h) { return h.price != null; })
      .sort(function (a, b) { return a.price - b.price; })
      .slice(0, 24);

    res.status(200).json({ hotels: hotels });
  } catch (err) {
    res.status(502).json({ error: "search_failed", message: err.message });
  }
};
