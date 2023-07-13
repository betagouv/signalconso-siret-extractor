import {Request, Router} from 'express'
import {dig} from '../services/tools.service.js'

const ToolsController = Router()

interface WebsiteRequest {
  website: string
}

ToolsController.post('/dig', async (req: Request<{}, {}, WebsiteRequest>, res, next) => {
  try {
    const website = req.body.website
    if (!website) {
      return res.status(400).send()
    }
    const result = await dig(website)
    return res.status(200).send(result)
  } catch (err) {
    next(err)
  }
})

export {ToolsController}
