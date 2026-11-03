import {Router} from 'express'
import {health, readBuildInfo} from '../services/health.service.js'

const HealthController = Router()

export const buildInfo = readBuildInfo(new URL('../buildinfo.json', import.meta.url))

HealthController.get('/', (req, res) => {
  return res.status(200).json(health(buildInfo))
})

export {HealthController}
