import {Router} from 'express'
import {extract} from './extract.service.js'
import * as argon2 from 'argon2'
import {Config} from './config.js'

const ExtractController = Router()

ExtractController.get('/:website', async (req, res, next) => {
  const apiKey = req.get('X-Api-Key')
  try {
    if (apiKey && (await argon2.verify(Config.apiKeyHash, apiKey))) {
      const website = req.params.website
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
