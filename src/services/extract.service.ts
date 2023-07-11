import {findSiretsOrSirens} from '../siret.js'
import {fetchUrl, headUrl, parseHomepage, parseSitemap} from '../clients/parsers.js'
import {SiretsOrSirens, Extraction, SiretOrSiren, Result, Sirene} from '../models/model.js'
import {WebsiteFailedException, WebsiteNotFoundException} from '../utils/exceptions.js'
import {fetchSiretInfo} from '../clients/entreprise.api.client.js'
import {Config} from '../config/config.js'

export const extract = async (website: string): Promise<Result> => {
  try {
    const siretOrSirens = await extractFrom(website)

    const expanded = isInBlacklist(Config.blackList, expand(siretOrSirens))

    const filtered = expanded
      .filter(_ => _.siret?.valid === true)
      .flatMap(_ => _.siret?.siret)
      .filter((item): item is string => !!item)

    const infosFromSirene = await fetchSiretInfo(filtered, Config.entrepriseToken)
    const extractions = merge(website, toMap(infosFromSirene), expanded)

    return {
      status: 'success',
      extractions: extractions,
    }
  } catch (e: any) {
    if (e instanceof WebsiteNotFoundException) {
      return {
        status: 'failure',
        error: 'NOT_FOUND',
      }
    } else if (e instanceof WebsiteFailedException) {
      return {
        status: 'failure',
        error: 'FAILED',
      }
    } else {
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

const getSitemapUrl = async (url: string) => {
  const robotsTxt = await fetchUrl(new URL('/robots.txt', url))
  const sitemapLine = robotsTxt.split('\n').find(line => line.match(/^Sitemap/g))
  if (sitemapLine) {
    return sitemapLine.split('Sitemap: ')[1]
  } else {
    return new URL('/sitemap.xml', url).href
  }
}

const fromSitemap = async (sitemapUrl: string): Promise<SiretsOrSirens[]> => {
  try {
    const mainSitemap = await fetchUrl(new URL(sitemapUrl))
    const links = await parseSitemap(mainSitemap)
    const potentialLinks = findPotentialPages(links)

    return findSiretsOrSirens(potentialLinks, fetchUrl)
  } catch {
    return Promise.resolve([])
  }
}

const fromHomepage = async (url: string): Promise<SiretsOrSirens[]> => {
  try {
    const homepage = await fetchUrl(new URL(url))
    const links = await parseHomepage(url, homepage)
    const potentialLinks = findPotentialPages(links.concat(url))

    return findSiretsOrSirens(potentialLinks, fetchUrl)
  } catch {
    return Promise.resolve([])
  }
}

const from = async (url: string): Promise<SiretsOrSirens[]> => {
  try {
    const sitemapUrl = await getSitemapUrl(url)
    const response = await headUrl(new URL(sitemapUrl), false)
    if (response.status >= 200 && response.status < 400) {
      const res = await fromSitemap(sitemapUrl)
      if (res.length === 0) {
        return fromHomepage(url)
      } else {
        return res
      }
    } else {
      return fromHomepage(url)
    }
  } catch {
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
      const response = await headUrl(new URL(url), true)
      if (response.status >= 200 && response.status < 300) {
        return url
      } else if (response.status == 301 || response.status == 302) {
        const location = response.headers.get('location')
        if (location) {
          return location
        } else {
          return finalUrl(hostname, schemes)
        }
      } else {
        return Promise.reject(new WebsiteFailedException(`Website returned ${response.status}`))
      }
    } catch {
      return finalUrl(hostname, schemes)
    }
  } else {
    return Promise.reject(new WebsiteNotFoundException(hostname))
  }
}

const extractFrom = async (hostname: string): Promise<SiretsOrSirens[]> => {
  const url = await finalUrl(hostname)
  return from(url)
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

const toMap = (sirenes: Sirene[]): Map<string, Sirene> => {
  return sirenes.reduce((map, obj) => {
    map.set(obj.siret, obj)
    return map
  }, new Map<string, Sirene>())
}

const merge = (url: string, sirenes: Map<string, Sirene>, siretsOrSirens: SiretOrSiren[]): Extraction[] => {
  return siretsOrSirens.map(siretOrSiren => {
    return {
      website: url,
      siret: siretOrSiren.siret,
      siren: siretOrSiren.siren,
      links: siretOrSiren.links,
      sirene: siretOrSiren.siret && sirenes.get(siretOrSiren.siret.siret),
    }
  })
}