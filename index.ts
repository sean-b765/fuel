import express from 'express'
import dotenv from 'dotenv'
import { inverseVincentyDistance, parseCoords } from './helpers'
import { getFuelData, getJourney } from './apis'
import rateLimit from 'express-rate-limit'
dotenv.config()
import cors from 'cors'

const app = express()

app.use(
	rateLimit({
		windowMs: 5 * 60 * 1000,
		max: 50,
		standardHeaders: true,
		legacyHeaders: false,
	})
)
app.use(
	cors({
		origin: '*',
	})
)
app.use(express.json())

app.get('/nearest/:coords', async (req, res) => {
	try {
		const { coords } = req.params

		const { lat, lng, error } = parseCoords(coords)

		if (error) return res.status(400).json({ message: 'Invalid coordinates.' })

		const result: { result: any[]; error?: boolean } = await getFuelData(
			lat,
			lng
		)

		if (result.error)
			return res.status(500).json({ message: 'Internal Server Error' })

		const sorted = result.result.sort(
			(objA, objB) => objA.distanceTo - objB.distanceTo
		)

		const nearest = sorted[0]
		if (!nearest) return res.status(400).json({ message: 'No results nearby' })

		// real journey time from google maps API
		const journey = await getJourney(
			`${nearest.latitude},${nearest.longitude}`,
			`${lat},${lng}`
		)

		if (journey[0]?.status !== 'ZERO_RESULTS') {
			nearest.distance = journey[0].distance.text
			nearest.duration = journey[0].duration.text
		}

		return res.json({ nearest })
	} catch (err) {
		return res.sendStatus(500)
	}
})

app.get('/nearestAndCheapest/:coords', async (req, res) => {
	const { coords } = req.params
	let radius = Number(req.query.radius === '0' ? '5' : req.query.radius || '5')
	if (radius <= 0) radius = 5
	if (radius > 70) radius = 50

	const { lat, lng, error } = parseCoords(coords)

	if (error) return res.status(400).json({ message: 'Invalid coordinates.' })

	const result: { result: any[]; error?: boolean } = await getFuelData(
		lat,
		lng,
		radius
	)

	if (result.error || !result)
		return res.status(500).json({ message: 'Internal Server Error' })

	if (result.result.length === 0)
		return res.status(400).json({ message: 'No results in your search radius' })

	const sorted = result.result.sort((objA, objB) => objA.price - objB.price)

	if (!sorted.length)
		return res.status(500).json({ error: 'Internal server error.' })

	// get google maps journey
	for (let i = 0; i < 5; i++) {
		try {
			const journey = await getJourney(
				`${lat},${lng}`,
				`${sorted[i].latitude},${sorted[i].longitude}`
			)

			if (!journey) continue
			if (journey[0]?.status === 'ZERO_RESULTS') continue

			sorted[i].distance = journey[0]?.distance?.text
			sorted[i].duration = journey[0]?.duration?.text
		} catch (err) {}
	}

	res
		.status(200)
		.json({ result: sorted.splice(1, sorted.length), nearest: sorted[0] })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
	console.log('Listening on', PORT)
})
