import {findSiretsOrSirens} from './siret.js'
import {fetchUrl, headUrl, parseHomepage, parseSitemap} from './parsers.js'
import {FoundSiretOrSiren, Extraction, SiretOrSiren, Result} from './FoundSiret.js'
import {WebsiteFailedException, WebsiteNotFoundException} from './utils/exceptions.js'
import {Sirene, fetchSiretInfo} from './apiClients.js'
import {Config} from './config.js'

export const extract = async (website: string): Promise<Result> => {
  try {
    const siretOrSirens = await compute(website)

    const expanded = expand(siretOrSirens)

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
    lowercaseLink.includes('siren')
  )
}

const findPotentialPages = (links: string[]): string[] => links.filter(link => potentialPageFilter(link))

const getSitemapUrl = async (url: string) => {
  const robotsTxt = await fetchUrl(new URL(`${url}/robots.txt`))
  const sitemapLine = robotsTxt.split('\n').find(line => line.match(/^Sitemap/g))
  if (sitemapLine) {
    return sitemapLine.split('Sitemap: ')[1]
  } else {
    return `${url}/sitemap.xml`
  }
}

const fromSitemap = async (sitemapUrl: string): Promise<FoundSiretOrSiren[]> => {
  try {
    const mainSitemap = await fetchUrl(new URL(sitemapUrl))
    const links = await parseSitemap(mainSitemap)
    const potentialLinks = findPotentialPages(links)

    return findSiretsOrSirens(potentialLinks, fetchUrl)
  } catch {
    return Promise.resolve([])
  }
}

const fromHomepage = async (url: string): Promise<FoundSiretOrSiren[]> => {
  try {
    const homepage = await fetchUrl(new URL(url))
    const links = await parseHomepage(url, homepage)
    const potentialLinks = findPotentialPages(links.concat(url))

    return findSiretsOrSirens(potentialLinks, fetchUrl)
  } catch {
    return Promise.resolve([])
  }
}

const from = async (url: string): Promise<FoundSiretOrSiren[]> => {
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

const compute = async (hostname: string): Promise<FoundSiretOrSiren[]> => {
  const url = await finalUrl(hostname)
  return from(url)
}

const expand = (founds: FoundSiretOrSiren[]): SiretOrSiren[] => {
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
      name: siretOrSiren.siret && sirenes.get(siretOrSiren.siret.siret)?.name,
      isOpen: siretOrSiren.siret && sirenes.get(siretOrSiren.siret.siret)?.isOpen,
    }
  })
}
