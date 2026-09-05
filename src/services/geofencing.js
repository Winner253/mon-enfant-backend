const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');

// Distance en mètres entre deux points GPS (formule de Haversine)
function distanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000; // rayon de la Terre en mètres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Vérifie la position de l'enfant par rapport à toutes ses zones actives.
// Crée une alerte à chaque transition entrée/sortie détectée.
function checkZones(childId, latitude, longitude) {
  const zones = db.prepare(
    'SELECT * FROM zones WHERE child_id = ? AND active = 1'
  ).all(childId);

  for (const zone of zones) {
    const distance = distanceMetres(latitude, longitude, zone.latitude, zone.longitude);
    const isInside = distance <= zone.rayon_metres ? 1 : 0;

    const previousState = db.prepare(
      'SELECT is_inside FROM zone_states WHERE zone_id = ? AND child_id = ?'
    ).get(zone.id, childId);

    const wasInside = previousState ? previousState.is_inside : null;

    if (wasInside !== null && wasInside !== isInside) {
      const type = isInside ? 'entree_zone' : 'sortie_zone';
      const message = isInside
        ? `Entré(e) dans la zone "${zone.nom}"`
        : `Sorti(e) de la zone "${zone.nom}"`;

      db.prepare(
        'INSERT INTO alerts (id, child_id, zone_id, type, message) VALUES (?, ?, ?, ?, ?)'
      ).run(uuidv4(), childId, zone.id, type, message);
    }

    db.prepare(`
      INSERT INTO zone_states (zone_id, child_id, is_inside, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(zone_id, child_id) DO UPDATE SET is_inside = excluded.is_inside, updated_at = CURRENT_TIMESTAMP
    `).run(zone.id, childId, isInside);
  }
}

module.exports = { distanceMetres, checkZones };
