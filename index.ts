import axios from 'axios'
import { parseString } from 'xml2js'
import express from 'express'

async function getFuelData() {
	return new Promise<any>((resolve, reject) => {
		axios
			.get('https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS')
			.then((res) => {
				const json = parseString(res.data, (err, result) => {
					resolve(result.rss.channel[0].item)
				})
			})
			.catch((err) => {
				reject(err)
			})
	})
}

function degreesToRad(deg) {
	return deg * (Math.PI / 180)
}
const key = 'AIzaSyDkXDRSjlwwChYJNL-rsfnwmwS_7ch1gmw'

async function getJourney(origin, destination) {
	return new Promise((resolve, reject) => {
		axios
			.get(
				`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&language=en-US&key=${key}`
			)
			.then((res) => {
				resolve(res.data.rows[0].elements)
			})
			.catch((err) => reject(err))
	})
}

function distanceBetweenCoords(latlng1: number[], latlng2: number[]) {
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

const app = express()

app.use(express.json())

app.get('/:coords', async (req, res) => {
	const { coords } = req.params

	let lat: number, lng: number
	try {
		lat = Number(coords.split(',')[0])
		lng = Number(coords.split(',')[1])

		if (isNaN(lat) || isNaN(lng)) throw TypeError()
	} catch (err) {
		return res
			.status(400)
			.json({ message: 'The coordinates you supplied are invalid.' })
	}

	console.log(lat, lng)

	const result: any[] = await getFuelData()
	for (let i = 0; i < result.length; i++) {
		// xml2js package returns all values as [ 'string' ], convert into just 'string'
		for (let j = 0; j < Object.values(result[i]).length; j++) {
			const value = Object.values(result[i])[j]
			const key = Object.keys(result[i])[j]

			// Attempt to convert the value into number
			const _value = Number(value[0])

			result[i][key] = isNaN(_value) ? value[0] : _value
		}

		// distance user's coordinates and servo coordinates
		const distanceBetween = distanceBetweenCoords(
			[result[i].latitude, result[i].longitude],
			[lat, lng]
		)
		result[i].distanceTo = distanceBetween
	}

	result.sort((objA, objB) => objA.distanceTo - objB.distanceTo)

	const nearest = result[0]

	// real journey time from google maps API
	const journey = await getJourney(
		`${nearest.latitude},${nearest.longitude}`,
		`${lat},${lng}`
	)

	nearest.distance = journey[0].distance.text
	nearest.duration = journey[0].duration.text

	return res.json({ lat, lng, nearest })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log('Listening on ', PORT)
})
