const { hasApiKey, liteApiGet, liteApiPost } = require("../_lib/liteapi");

/* ---------- Demo data (used until LITEAPI_KEY is configured) ---------- */
function demoHotels(destination) {
  const label = destination || "your destination";
  return [
    { name: "Grand " + label + " Hotel", stars: 5, address: "Central district, " + label, price: 214, currency: "USD", board: "Breakfast Included", freeCancellation: true },
    { name: label + " Bay Resort", stars: 4, address: "Waterfront promenade, " + label, price: 156, currency: "USD", board: "Room Only", freeCancellation: true },
    { name: "The " + label + " Suites", stars: 4, address: "Business district, " + label, price: 132, currency: "USD", board: "Breakfast Included", freeCancellation: false },
    { name: label + " Garden Inn", stars: 3, address: "Old town, " + label, price: 89, currency: "USD", board: "Room Only", freeCancellation: true }
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

function cheapestRate(hotel) {
  let best = null;
  (hotel.roomTypes || []).forEach(function (rt) {
    (rt.rates || []).forEach(function (rate) {
      const amount = rate && rate.retailRate && rate.retailRate.total &&
        (Array.isArray(rate.retailRate.total) ? rate.retailRate.total[0].amount : rate.retailRate.total.amount);
      if (amount == null) return;
      if (!best || amount < best.amount) {
        best = {
          amount: amount,
          currency: (Array.isArray(rate.retailRate.total) ? rate.retailRate.total[0].currency : rate.retailRate.total.currency) || "USD",
          board: boardLabel(rate),
          freeCancellation: isRefundable(rate)
        };
      }
    });
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

    const rawHotels = data.data || data.hotels || [];
    const hotels = rawHotels.map(function (hotel) {
      const rate = cheapestRate(hotel);
      const info = hotel.hotelData || hotel;
      return {
        name: info.name || "Hotel",
        stars: info.stars || info.starRating || null,
        address: info.address || "",
        price: rate ? rate.amount : null,
        currency: rate ? rate.currency : "USD",
        board: rate ? rate.board : "",
        freeCancellation: rate ? rate.freeCancellation : false
      };
    }).filter(function (h) { return h.price != null; });

    res.status(200).json({ hotels: hotels });
  } catch (err) {
    res.status(502).json({ error: "search_failed", message: err.message });
  }
};
