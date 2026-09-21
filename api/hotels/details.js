const { hasApiKey, liteApiGet, liteApiPost } = require("../_lib/liteapi");

function demoDetails(id) {
  return {
    id: id,
    name: "Grand Hotel",
    stars: 5,
    address: "Central district",
    description: "A refined stay in the heart of the city, minutes from the main sights and business district. Rooms are finished with warm, contemporary interiors and full service amenities.",
    facilities: ["Free WiFi", "Swimming Pool", "Fitness Centre", "24-Hour Front Desk", "Airport Shuttle", "Restaurant", "Air Conditioning", "Parking"],
    images: [
      { url: "" }, { url: "" }, { url: "" }, { url: "" }
    ],
    rooms: [
      { name: "Deluxe Room", board: "Breakfast Included", price: 214, currency: "USD", freeCancellation: true },
      { name: "Executive Suite", board: "Room Only", price: 289, currency: "USD", freeCancellation: true },
      { name: "Family Room", board: "Breakfast Included", price: 246, currency: "USD", freeCancellation: false }
    ],
    demo: true
  };
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

function stripHtml(html) {
  return (html || "").toString().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

module.exports = async function handler(req, res) {
  const q = req.query;
  const hotelId = (q.id || "").toString().trim();
  const checkin = (q.checkin || "").toString();
  const checkout = (q.checkout || "").toString();
  const rooms = Math.max(1, parseInt(q.rooms, 10) || 1);
  const adults = Math.max(1, parseInt(q.adults, 10) || 2);
  const nationality = (q.nationality || "KW").toString();

  if (!hotelId) { res.status(400).json({ error: "id_required" }); return; }

  if (!hasApiKey() || hotelId.indexOf("demo-") === 0) {
    res.status(200).json(demoDetails(hotelId));
    return;
  }

  try {
    const [content, rates] = await Promise.all([
      liteApiGet("/data/hotel", { hotelId: hotelId }),
      (function () {
        const occupancies = [];
        for (let i = 0; i < rooms; i++) occupancies.push({ adults: adults });
        return liteApiPost("/hotels/rates", {
          hotelIds: [hotelId],
          checkin: checkin,
          checkout: checkout,
          currency: "USD",
          guestNationality: nationality,
          occupancies: occupancies,
          maxRatesPerHotel: 20
        }).catch(function () { return null; });
      })()
    ]);

    const info = content.data || {};

    const images = (info.hotelImages || [])
      .slice()
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .map(function (img) { return { url: img.urlHd || img.url, caption: img.caption || "" }; })
      .filter(function (img) { return !!img.url; });
    if (!images.length && (info.main_photo || info.thumbnail)) {
      images.push({ url: info.main_photo || info.thumbnail, caption: "" });
    }

    const facilities = (info.hotelFacilities && info.hotelFacilities.length ? info.hotelFacilities : null) ||
      (info.facilities || []).map(function (f) { return f.name; }).filter(Boolean);

    let roomRates = [];
    const rateHotel = rates && rates.data && rates.data[0];
    if (rateHotel) {
      (rateHotel.roomTypes || []).forEach(function (rt) {
        (rt.rates || []).forEach(function (rate) {
          const amt = rateAmount(rate);
          if (!amt) return;
          roomRates.push({
            name: rate.name || "Room",
            board: boardLabel(rate),
            price: amt.amount,
            currency: amt.currency || "USD",
            freeCancellation: isRefundable(rate)
          });
        });
      });
      roomRates.sort(function (a, b) { return a.price - b.price; });
    }

    res.status(200).json({
      id: hotelId,
      name: info.name || "Hotel",
      stars: info.starRating || info.stars || null,
      address: [info.address, info.city].filter(Boolean).join(", "),
      description: stripHtml(info.hotelDescription).slice(0, 900),
      facilities: facilities.slice(0, 12),
      images: images.slice(0, 12),
      rooms: roomRates
    });
  } catch (err) {
    res.status(502).json({ error: "details_failed", message: err.message });
  }
};
