/**
 * Gets distance approximate between two coordinates via a straight line
 * @param latlng1 array formatted as [latitude, longitude]
 * @param latlng2 array formatted as [latitude, longitude]
 * @returns number
 */
export function distanceBetweenCoords(latlng1: number[], latlng2: number[]) {
	/*
    https://en.wikipedia.org/wiki/Haversine_formula
  */
	const R = 6371
	const deltaLat = degreesToRad(latlng1[0] - latlng2[0])
	const deltaLng = degreesToRad(latlng1[1] - latlng2[1])

	const a =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(degreesToRad(latlng1[0])) *
			Math.cos(degreesToRad(latlng2[0])) *
			Math.sin(deltaLng / 2) *
			Math.sin(deltaLng / 2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

	const d = R * c

	return d
}

export function parseCoords(coords: string): {
	lat?: number
	lng?: number
	error?: boolean
} {
	let lat: number, lng: number
	try {
		lat = Number(coords.split(',')[0])
		lng = Number(coords.split(',')[1])

		if (isNaN(lat) || isNaN(lng)) throw TypeError()
		return { lat, lng, error: false }
	} catch (err) {
		return { error: true }
	}
}

export function degreesToRad(deg) {
	return deg * (Math.PI / 180)
}
