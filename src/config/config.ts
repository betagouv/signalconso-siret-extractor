export const Config = {
  port: process.env.SIRET_EXTRACTOR_PORT,
  entrepriseToken: process.env.SIRET_EXTRACTOR_ENTREPRISE_TOKEN ?? '',
  apiKeyHash: process.env.SIRET_EXTRACTOR_API_KEY_HASH ?? '',
  blackList: process.env.SIRET_EXTRACTOR_SIREN_BLACK_LIST?.split(',') ?? [],
  fetchTimeout: parseInt(process.env.SIRET_EXTRACTOR_FETCH_TIMEOUT ?? '5000'),
}
