import axios from 'axios'
import { parseString } from 'xml2js'
import { distanceBetweenCoords } from './helpers'

export async function getFuelData(
	lat: number,
	lng: number,
	radius = null as number
) {
	return new Promise<any>((resolve, reject) => {
		axios
			.get('https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS')
			.then((res) => {
				parseString(res.data, (err, result) => {
					const _result = result.rss.channel[0].item
					for (let i = 0; i < _result.length; i++) {
						// xml2js package returns all values as [ 'string' ], convert into just 'string'
						for (let j = 0; j < Object.values(_result[i]).length; j++) {
							const value = Object.values(_result[i])[j]
							const key = Object.keys(_result[i])[j]

							// Attempt to convert the value into number
							const _value = Number(value[0])

							_result[i][key] = isNaN(_value) ? value[0] : _value
						}

						// distance user's coordinates and servo coordinates
						const distanceBetween = distanceBetweenCoords(
							[_result[i].latitude, _result[i].longitude],
							[lat, lng]
						)
						_result[i].distanceTo = distanceBetween
					}

					if (radius) {
						// get the results within the specified radius
						let _returnArray = []
						for (let i = 0; i < _result.length; i++) {
							if (_result[i].distanceTo <= radius) {
								_returnArray.push(_result[i])
							}
						}

						resolve({ result: _returnArray, error: false })
					} else {
						resolve({ result: _result, error: false })
					}
				})
			})
			.catch((err) => {
				reject({ result: null, error: err })
			})
	})
}

export async function getJourney(origin: string, destination: string) {
	return new Promise((resolve, reject) => {
		axios
			.get(
				`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&language=en-US&key=${process.env.KEY}`
			)
			.then((res) => {
				if (!res.data?.rows[0]) resolve(null)

				resolve(res.data?.rows[0]?.elements)
			})
			.catch((err) => reject(err))
	})
}
