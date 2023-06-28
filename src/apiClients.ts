// export interface Company {
//     siret: string
// }

// export interface UnknownWebisteEntity {
//     host: string
//     company?: Company
// }

// export interface UnknownWebiste {
//     entities: UnknownWebisteEntity[]
// }

export interface Sirene {
  siret: string
  name?: string
  isOpen: boolean
}

// export const fetchUnknownWebsites = async (limit: number, token: string): Promise<UnknownWebiste> => {
//     const res = await fetch(`https://signal-api.conso.gouv.fr/api/websites?limit=${limit}&offset=0&identificationStatus=NotIdentified&start=2023-05-30T22:00:00.000Z`, {
//         method: 'GET',
//         headers: {
//             "X-Auth-Token": token
//         }
//     })
//     return res.json()
// }

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
