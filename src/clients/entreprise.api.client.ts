import {Sirene} from '../models/model.js'

export const fetchSiretInfo = async (sirets: string[], token: string): Promise<Sirene[]> => {
  const res = await fetch('https://entreprise.signal.conso.gouv.fr/api/companies/search', {
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
  const res = await fetch('https://entreprise.signal.conso.gouv.fr/api/companies/siren/search', {
    method: 'POST',
    body: JSON.stringify(sirens),
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': token,
    },
  })
  return res.json()
}
