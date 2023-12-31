import {Request, Router} from 'express'
import {extract} from '../services/extract.service.js'
import * as argon2 from 'argon2'
import {Config} from '../config/config.js'

const ExtractController = Router()

interface WebsiteRequest {
  website: string
}

ExtractController.post('/', async (req: Request<{}, {}, WebsiteRequest>, res, next) => {
  try {
    const apiKey = req.get('X-Api-Key')
    if (apiKey && (await argon2.verify(Config.apiKeyHash, apiKey))) {
      const website = req.body.website
      if (!website) {
        return res.status(400).send()
      }
      const result = await extract(website)
      return res.status(200).json(result)
    } else {
      return res.status(401).send()
    }
  } catch (err) {
    next(err)
  }
})

export {ExtractController}
