/**
 * Parses a location string to extract coordinates and address.
 * Expected format: "address (latitude, longitude)"
 * 
 * @param locationString - The location string to parse
 * @returns An object with latitude, longitude, and address, or null if parsing fails
 */
export const parseLocationCoordinates = (
  locationString?: string | null
): { latitude: number; longitude: number; address: string } | null => {
  if (!locationString) return null;

  // Try to parse coordinates from string like "address (lat, lng)"
  const coordMatch = locationString.match(
    /^(.+?)\s*\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)$/
  );
  if (coordMatch) {
    const address = coordMatch[1].trim();
    const lat = parseFloat(coordMatch[2]);
    const lng = parseFloat(coordMatch[3]);

    // Validate coordinates
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return {
        latitude: lat,
        longitude: lng,
        address: address,
      };
    }
  }

  return null;
};
