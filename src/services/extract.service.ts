import {findSiretsOrSirens} from '../siret.js'
import {fetchUrl, fetchResponseUrl, parseHomepage, parseSitemap} from '../clients/parsers.js'
import {SiretsOrSirens, Extraction, SiretOrSiren, Result, Sirene} from '../models/model.js'
import {AntiBotException, WebsiteFailedException, WebsiteNotFoundException} from '../utils/exceptions.js'
import {fetchSirenInfo, fetchSiretInfo} from '../clients/entreprise.api.client.js'
import {Config} from '../config/config.js'

export const extract = async (website: string): Promise<Result> => {
  try {
    const siretOrSirens = await extractFrom(website)

    const expanded = isInBlacklist(Config.blackList, expand(siretOrSirens))

    const filteredBySiret = expanded
      .filter(_ => _.siret?.valid === true)
      .flatMap(_ => _.siret?.siret)
      .filter((item): item is string => !!item)

    const siretInfosFromSirene = await fetchSiretInfo(filteredBySiret, Config.entrepriseToken)
    console.debug('Entreprise API siret returned', siretInfosFromSirene)

    const filteredBySiren = expanded
      .filter(_ => _.siren?.valid === true)
      .flatMap(_ => _.siren?.siren)
      .filter((item): item is string => !!item)

    const sirenInfosFromSirene = await fetchSirenInfo(filteredBySiren, Config.entrepriseToken)
    console.debug('Entreprise API siren returned', sirenInfosFromSirene)

    const extractions = merge(
      toMap(siretInfosFromSirene, sirene => sirene.siret),
      toMap(sirenInfosFromSirene, sirene => sirene.siret.substring(0, 9)),
      expanded,
    )

    return {
      website,
      status: 'success',
      extractions: extractions,
    }
  } catch (e: any) {
    if (e instanceof WebsiteNotFoundException) {
      return {
        website,
        status: 'failure',
        error: 'NOT_FOUND',
      }
    } else if (e instanceof WebsiteFailedException) {
      return {
        website,
        status: 'failure',
        error: 'FAILED',
      }
    } else if (e instanceof AntiBotException) {
      return {
        website,
        status: 'failure',
        error: 'ANTIBOT',
      }
    } else {
      console.warn('Error while extracting Siret', e)
      throw e
    }
  }
}

const potentialPageFilter = (link: string): boolean => {
  const lowercaseLink = link.toLowerCase()

  return (
    lowercaseLink.includes('cgu') ||
    lowercaseLink.includes('cgv') ||
    lowercaseLink.includes('condition') ||
    lowercaseLink.includes('utilisation') ||
    lowercaseLink.includes('vente') ||
    lowercaseLink.includes('mention') ||
    lowercaseLink.includes('legal') || // Gère le francais et l'anglais
    lowercaseLink.includes('notice') ||
    lowercaseLink.includes('propos') || // page à propos
    lowercaseLink.includes('sommes') || // qui sommes nous ?
    lowercaseLink.includes('siret') ||
    lowercaseLink.includes('siren') ||
    lowercaseLink.includes('politique')
  )
}

export const isInList = (sirens: string[], siretOrSiren: SiretOrSiren): boolean => {
  const isInList =
    (siretOrSiren.siren && sirens.includes(siretOrSiren.siren.siren)) ||
    (siretOrSiren.siret && sirens.includes(siretOrSiren.siret.siret.substring(0, 9)))

  return !!isInList
}

export const isInBlacklist = (sirens: string[], siretsOrSirens: SiretOrSiren[]) => {
  return siretsOrSirens.filter(siretOrSiren => !isInList(sirens, siretOrSiren))
}

export const findPotentialPages = (links: string[]): string[] => links.filter(link => potentialPageFilter(link))

const getSitemapUrl = async (url: string): Promise<string[]> => {
  try {
    const robotsTxt = await fetchUrl(new URL('/robots.txt', url))
    const sitemapLines = robotsTxt.split('\n').filter(line => line.match(/^Sitemap/g))
    if (sitemapLines.length !== 0) {
      return sitemapLines.map(_ => _.split('Sitemap: ')[1])
    } else {
      return [new URL('/sitemap.xml', url).href]
    }
  } catch (e) {
    console.debug(`No robots.txt found`)
    return [new URL('/sitemap.xml', url).href]
  }
}

const fromSitemap = async (sitemapUrl: string): Promise<SiretsOrSirens[]> => {
  try {
    const mainSitemap = await fetchUrl(new URL(sitemapUrl))
    const links = await parseSitemap(mainSitemap)
    const potentialLinks = findPotentialPages(links)
    console.debug(`${potentialLinks.length} potential pages found from sitemap`)

    return findSiretsOrSirens(potentialLinks, fetchUrl)
  } catch {
    console.debug(`No Sitemap at ${sitemapUrl}`)
    return Promise.resolve([])
  }
}

const fromSitemaps = async (sitemapUrls: string[]): Promise<SiretsOrSirens[]> => {
  const results = sitemapUrls.map(sitemapUrl => fromSitemap(sitemapUrl))
  return Promise.all(results)
    .then(_ => _.flat())
    .then(_ => _.filter((link, index, self) => self.indexOf(link) === index))
}

const fromHomepage = async (url: string): Promise<SiretsOrSirens[]> => {
  try {
    const homepage = await fetchUrl(new URL(url))
    const links = await parseHomepage(url, homepage)
    const potentialLinks = findPotentialPages(links.concat(url))
    console.debug(`${potentialLinks.length} potential pages found from homepage`)

    return findSiretsOrSirens(potentialLinks, fetchUrl)
  } catch {
    console.debug(`No valid homepage at ${url}`)
    return Promise.resolve([])
  }
}

const from = async (url: string): Promise<SiretsOrSirens[]> => {
  try {
    const sitemapUrls = await getSitemapUrl(url)
    console.debug(`Computed sitemap url: ${sitemapUrls}`)
    const res = await fromSitemaps(sitemapUrls)
    if (res.length === 0) {
      console.debug(`No siret found from Sitemap for ${url}, trying homepage`)
      return fromHomepage(url)
    } else {
      return res
    }
  } catch (e: any) {
    console.debug(`Error while fetching ${url}`, e)
    return Promise.resolve([])
  }
}

const finalUrl = async (
  hostname: string,
  schemes: string[] = ['http://www.', 'https://www.', 'http://', 'https://'],
): Promise<string> => {
  const scheme = schemes.pop()
  if (scheme) {
    try {
      const url = `${scheme}${hostname}`
      const response = await fetchResponseUrl(new URL(url), true)
      if (response.status >= 200 && response.status < 300) {
        return url
      } else if (response.status == 301 || response.status == 302) {
        const location = response.headers.get('location')
        // relatives urls
        if (location && location.startsWith('/')) {
          return `${url}${location}`
        } else if (location) {
          return location
        } else {
          return finalUrl(hostname, schemes)
        }
      } else {
        console.debug(`Website at ${url} return ${response.status}`)
        return Promise.reject(new WebsiteFailedException(`Website returned ${response.status}`))
      }
    } catch {
      return finalUrl(hostname, schemes)
    }
    // Hack because users tend to write websites as wwwtest.com without the '.'
    // So we try to remove the 'www' part
  } else if (hostname.match(/^www[^.]/)) {
    return finalUrl(hostname.substring(3), ['http://www.', 'https://www.'])
  } else {
    return Promise.reject(new WebsiteNotFoundException(hostname))
  }
}

const extractFrom = async (hostname: string): Promise<SiretsOrSirens[]> => {
  const url = await finalUrl(hostname)
  console.debug(`Url computed for ${hostname}: ${url}`)
  const result = await from(url)

  if (result.length === 0) {
    const response = await fetchResponseUrl(new URL(url), false)
    const page = await response.text()
    if (response.status === 403 || page.includes('Enable JavaScript and cookies to continue')) {
      throw new AntiBotException('An anti protection is active')
    } else {
      return result
    }
  } else {
    return result
  }
}

const expand = (founds: SiretsOrSirens[]): SiretOrSiren[] => {
  const map = new Map<string, SiretOrSiren>()
  founds.forEach(found => {
    found.sirens.forEach(siren => {
      const oldValue = map.get(siren.siren)
      const newValue = oldValue ? [...oldValue.links, found.link] : [found.link]
      map.set(siren.siren, {siren: siren, links: newValue})
    })

    found.sirets.forEach(siret => {
      const oldValue = map.get(siret.siret)
      const newValue = oldValue ? [...oldValue.links, found.link] : [found.link]
      map.set(siret.siret, {siret: siret, links: newValue})
    })
  })
  return [...map.values()]
}

const toMap = (sirenes: Sirene[], extractKey: (sirene: Sirene) => string): Map<string, Sirene> => {
  return sirenes.reduce((map, obj) => {
    map.set(extractKey(obj), obj)
    return map
  }, new Map<string, Sirene>())
}

const merge = (
  siretsInfos: Map<string, Sirene>,
  sirensInfos: Map<string, Sirene>,
  siretsOrSirens: SiretOrSiren[],
): Extraction[] => {
  return siretsOrSirens.map(siretOrSiren => {
    return {
      siret: siretOrSiren.siret,
      siren: siretOrSiren.siren,
      links: siretOrSiren.links,
      sirene:
        (siretOrSiren.siret && siretsInfos.get(siretOrSiren.siret.siret)) ||
        (siretOrSiren.siren && sirensInfos.get(siretOrSiren.siren.siren)),
    }
  })
}
