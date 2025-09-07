export const degToRad = (degrees: number): number => degrees * (Math.PI / 180);

export const calculateArrowEnd = (
  startLat: number,
  startLng: number,
  direction: number,
  distanceKm: number
): [number, number] => {
  const earthRadius = 6371;
  const latRad = degToRad(startLat);
  const lngRad = degToRad(startLng);
  const bearing = degToRad(direction);

  const endLat = Math.asin(
    Math.sin(latRad) * Math.cos(distanceKm / earthRadius) +
    Math.cos(latRad) * Math.sin(distanceKm / earthRadius) * Math.cos(bearing)
  );

  const endLng = lngRad + Math.atan2(
    Math.sin(bearing) * Math.sin(distanceKm / earthRadius) * Math.cos(latRad),
    Math.cos(distanceKm / earthRadius) - Math.sin(latRad) * Math.sin(endLat)
  );

  return [endLat * (180 / Math.PI), endLng * (180 / Math.PI)];
};

