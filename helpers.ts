const asin = Math.asin
const cos = Math.cos
const sin = Math.sin
const sqrt = Math.sqrt
const PI = Math.PI

// equatorial mean radius of Earth (in meters)
const R = 6378137

function squared(x: number) {
	return x * x
}
function toRad(x: number) {
	return (x * PI) / 180.0
}
function hav(x: number) {
	return squared(sin(x / 2))
}

/**
 * Gets distance approximate between two coordinates via a straight line
 * @param a array formatted as [latitude, longitude]
 * @param b array formatted as [latitude, longitude]
 * @returns number
 */
export function distanceBetweenCoords(a: number[], b: number[]) {
	const aLat = toRad(a[0])
	const bLat = toRad(b[0])
	const aLng = toRad(a[1])
	const bLng = toRad(b[1])

	const ht = hav(bLat - aLat) + cos(aLat) * cos(bLat) * hav(bLng - aLng)
	return (2 * R * asin(sqrt(ht))) / 1000
}

export function inverseVincentyDistance(
	pointOne: { lng: number; lat: number },
	pointTwo: { lng: number; lat: number }
): number {
	const toRadians = (latOrLng: number) => (latOrLng * Math.PI) / 180

	const phiOne = toRadians(pointOne.lat)
	const lambda1 = toRadians(pointOne.lng)
	const phiTwo = toRadians(pointTwo.lat)
	const lambda2 = toRadians(pointTwo.lng)

	const wgs84ellipsoid = {
		a: 6378137,
		b: 6356752.314245,
		f: 1 / 298.257223563,
	}
	const { a, b, f } = wgs84ellipsoid

	const L = lambda2 - lambda1 // L = difference in longitude, U = reduced latitude, defined by tan U = (1-f)·tanphi.
	const tanU1 = (1 - f) * Math.tan(phiOne),
		cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
		sinU1 = tanU1 * cosU1
	const tanU2 = (1 - f) * Math.tan(phiTwo),
		cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2),
		sinU2 = tanU2 * cosU2

	const antipodal =
		Math.abs(L) > Math.PI / 2 || Math.abs(phiTwo - phiOne) > Math.PI / 2

	let lambda = L,
		sinLambda = null,
		cosLambda = null // lambda = difference in longitude on an auxiliary sphere
	let sigma = antipodal ? Math.PI : 0,
		sinSigma = 0,
		cosSigma = antipodal ? -1 : 1,
		sinSqsigma = null // sigma = angular distance P₁ P₂ on the sphere
	let cos2sigmaM = 1 // sigmaM = angular distance on the sphere from the equator to the midpoint of the line
	let sinalpha = null,
		cosSqAlpha = 1 // alpha = azimuth of the geodesic at the equator
	let C = null

	let _lambda = null,
		iterations = 0
	do {
		sinLambda = Math.sin(lambda)
		cosLambda = Math.cos(lambda)
		sinSqsigma =
			cosU2 * sinLambda * (cosU2 * sinLambda) +
			(cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
				(cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)

		if (Math.abs(sinSqsigma) < Number.EPSILON) {
			break // co-incident/antipodal points (falls back on lambda/sigma = L)
		}

		sinSigma = Math.sqrt(sinSqsigma)
		cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda
		sigma = Math.atan2(sinSigma, cosSigma)
		sinalpha = (cosU1 * cosU2 * sinLambda) / sinSigma
		cosSqAlpha = 1 - sinalpha * sinalpha
		cos2sigmaM =
			cosSqAlpha != 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0 // on equatorial line cos²alpha = 0 (§6)
		C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha))
		_lambda = lambda
		lambda =
			L +
			(1 - C) *
				f *
				sinalpha *
				(sigma +
					C *
						sinSigma *
						(cos2sigmaM + C * cosSigma * (-1 + 2 * cos2sigmaM * cos2sigmaM)))
		const iterationCheck = antipodal
			? Math.abs(lambda) - Math.PI
			: Math.abs(lambda)
		if (iterationCheck > Math.PI) {
			throw new Error('lambda > Math.PI')
		}
	} while (Math.abs(lambda - _lambda) > 1e-12 && ++iterations < 1000)
	if (iterations >= 1000) {
		throw new Error('Vincenty formula failed to converge')
	}

	const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b)
	const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)))
	const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)))
	const deltaSigma =
		B *
		sinSigma *
		(cos2sigmaM +
			(B / 4) *
				(cosSigma * (-1 + 2 * cos2sigmaM * cos2sigmaM) -
					(B / 6) *
						cos2sigmaM *
						(-3 + 4 * sinSigma * sinSigma) *
						(-3 + 4 * cos2sigmaM * cos2sigmaM)))

	const distance = b * A * (sigma - deltaSigma) // distance = length of the geodesic

	return distance
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
