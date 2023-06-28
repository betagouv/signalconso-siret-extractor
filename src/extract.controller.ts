import {Router} from 'express'
import {extract} from './extract.service.js'

const ExtractController = Router()

ExtractController.get('/:website', async (req, res, next) => {
  try {
    const website = req.params.website
    const result = await extract(website)
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

export {ExtractController}
