import express from 'express'
import cors from 'cors'
import {UnknownRoutesHandler} from './middlewares/unknown.handler.js'
import {ExceptionsHandler} from './middlewares/exceptions.handler.js'
import {ExtractController} from './controllers/extract.controller.js'
import {Config} from './config/config.js'
import {ToolsController} from './controllers/tools.controller.js'

const app = express()
const port = Config.port

/**
 * On dit à Express que l'on souhaite parser le body des requêtes en JSON
 *
 * @example app.post('/', (req) => req.body.prop)
 */
app.use(express.json())

/**
 * On dit à Express que l'on souhaite autoriser tous les noms de domaines
 * à faire des requêtes sur notre API.
 */
app.use(cors())

app.use('/extract', ExtractController)

app.use('/tools', ToolsController)

/**
 * Pour toutes les autres routes non définies, on retourne une erreur
 */
app.all('*', UnknownRoutesHandler)

/**
 * Gestion des erreurs
 * /!\ Cela doit être le dernier `app.use`
 */
app.use(ExceptionsHandler)

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`)
})
