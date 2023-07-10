import {Sirene} from './FoundSiret.js'

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
