import {Sirene} from '../models/model.js'
import {Config} from '../config/config.js'

export const fetchSiretInfo = async (sirets: string[], token: string): Promise<Sirene[]> => {
  const res = await fetch(`${Config.entrepriseUrl}/api/companies/search`, {
    method: 'POST',
    body: JSON.stringify(sirets),
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': token,
    },
  })
  return res.json()
}

export const fetchSirenInfo = async (sirens: string[], token: string): Promise<Sirene[]> => {
  const res = await fetch(`${Config.entrepriseUrl}/api/companies/siren/search`, {
    method: 'POST',
    body: JSON.stringify(sirens),
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': token,
    },
  })
  return res.json()
}
