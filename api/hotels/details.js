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
    roomGalleries: [],
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

    /* `url` is the standard-resolution image used for thumbnails; `hdUrl`
       is only fetched when the visitor actually enlarges that photo, so
       the page doesn't pull dozens of full-size images just to render
       150px-wide thumbnails. */
    const images = (info.hotelImages || [])
      .slice()
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .map(function (img) { return { url: img.url || img.urlHd, hdUrl: img.urlHd || img.url, caption: img.caption || "" }; })
      .filter(function (img) { return !!img.url; })
      .slice(0, 10);
    if (!images.length && (info.main_photo || info.thumbnail)) {
      images.push({ url: info.thumbnail || info.main_photo, hdUrl: info.main_photo || info.thumbnail, caption: "" });
    }

    const facilities = (info.hotelFacilities && info.hotelFacilities.length ? info.hotelFacilities : null) ||
      (info.facilities || []).map(function (f) { return f.name; }).filter(Boolean);

    /* Per-room-type photo galleries ("Images of Standard Room", etc.) */
    const seenRoomNames = {};
    const roomGalleries = (info.rooms || []).map(function (r) {
      const roomImages = (r.photos || [])
        .map(function (p) { return { url: p.url || p.hd_url, hdUrl: p.hd_url || p.url, caption: p.imageDescription || "" }; })
        .filter(function (p) { return !!p.url; })
        .slice(0, 6);
      return { name: r.roomName || "Room", images: roomImages };
    }).filter(function (group) {
      if (!group.images.length) return false;
      const key = group.name.toLowerCase();
      if (seenRoomNames[key]) return false;
      seenRoomNames[key] = true;
      return true;
    }).slice(0, 6);

    /* Each roomTypes[] entry is one bookable offer. When more than one
       room is requested, its `rates` array holds one entry PER ROOM
       (occupancyNumber 1, 2, ...) that must be summed to get the total
       price for the whole stay — LiteAPI does not sum them for you.
       Multiple suppliers also often return the same room+board combo at
       (near-)identical prices, so we keep only the cheapest offer per
       name+board+cancellation combo. */
    let roomRates = [];
    const rateHotel = rates && rates.data && rates.data[0];
    if (rateHotel) {
      const bestByKey = {};
      (rateHotel.roomTypes || []).forEach(function (rt) {
        let total = 0, currency = "USD", name = "Room", board = "", freeCancellation = true, count = 0;
        (rt.rates || []).forEach(function (rate) {
          const amt = rateAmount(rate);
          if (!amt) return;
          count++;
          total += amt.amount;
          currency = amt.currency || currency;
          if (count === 1) { name = rate.name || "Room"; board = boardLabel(rate); }
          if (!isRefundable(rate)) freeCancellation = false;
        });
        if (!count) return;
        const key = name.toLowerCase() + "|" + board.toLowerCase() + "|" + freeCancellation;
        if (!bestByKey[key] || total < bestByKey[key].price) {
          bestByKey[key] = { name: name, board: board, price: total, currency: currency, freeCancellation: freeCancellation };
        }
      });
      roomRates = Object.keys(bestByKey).map(function (k) { return bestByKey[k]; });
      roomRates.sort(function (a, b) { return a.price - b.price; });
      roomRates = roomRates.slice(0, 12);
    }

    res.status(200).json({
      id: hotelId,
      name: info.name || "Hotel",
      stars: info.starRating || info.stars || null,
      address: [info.address, info.city].filter(Boolean).join(", "),
      description: stripHtml(info.hotelDescription).slice(0, 900),
      facilities: facilities.slice(0, 12),
      images: images.slice(0, 12),
      roomGalleries: roomGalleries,
      rooms: roomRates
    });
  } catch (err) {
    res.status(502).json({ error: "details_failed", message: err.message });
  }
};
