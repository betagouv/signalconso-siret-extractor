export interface Siret {
  siret: string
  valid: boolean
}

export interface Siren {
  siren: string
  valid: boolean
}

export interface FoundSiretOrSiren {
  sirets: Siret[]
  sirens: Siren[]
  link: string
}

export interface SiretOrSiren {
  siret?: Siret
  siren?: Siren
  links: string[]
}

export interface Full {
  website: string
  siret?: Siret
  siren?: Siren
  links: string[]
  name?: string
  isOpen?: boolean
}
