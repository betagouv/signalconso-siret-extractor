export const Config = {
  port: process.env.SIRET_EXTRACTOR_PORT,
  entrepriseToken: process.env.SIRET_EXTRACTOR_ENTREPRISE_TOKEN ?? '',
  apiKeyHash: process.env.SIRET_EXTRACTOR_API_KEY_HASH ?? '',
  blackList: process.env.BLACK_LIST?.split(',') ?? [],
}
