import {Request, Router} from 'express'
import {dig} from './tools.service.js'

const ToolsController = Router()

interface WebsiteRequest {
  website: string
}

ToolsController.post('/dig', async (req: Request<{}, {}, WebsiteRequest>, res, next) => {
  const website = req.body.website
  if (!website) {
    return res.status(400).send()
  }
  const result = await dig(website)
  return res.status(200).send(result)
})

export {ToolsController}
