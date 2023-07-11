export interface Siret {
  siret: string
  valid: boolean
}

export interface Siren {
  siren: string
  valid: boolean
}

export interface SiretsOrSirens {
  sirets: Siret[]
  sirens: Siren[]
  link: string
}

export interface SiretOrSiren {
  siret?: Siret
  siren?: Siren
  links: string[]
}

export interface Extraction {
  website: string
  siret?: Siret
  siren?: Siren
  links: string[]
  sirene?: Sirene
}

export interface Result {
  status: 'success' | 'failure'
  extractions?: Extraction[]
  error?: string
}

export interface Address {
  number?: string
  street?: string
  addressSupplement?: string
  postalCode?: string
  city?: string
  country?: string
}

export interface Sirene {
  siret: string
  name?: string
  commercialName?: string
  brand?: string
  isHeadOffice: boolean
  isOpen: boolean
  isPublic: boolean
  address: Address
  activityCode: string
  activityLabel?: string
  isMarketPlace: boolean
}
