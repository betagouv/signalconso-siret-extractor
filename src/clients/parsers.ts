import jsdom from 'jsdom'
import {PageNotFoundException, WebsiteNotFoundException} from '../utils/exceptions.js'
import {Config} from '../config/config.js'

// TODO Add a delay to each fetch ? https://stackoverflow.com/a/73949725

// https://dmitripavlutin.com/timeout-fetch-request/
async function fetchWithTimeout(resource: URL, options: any = {}) {
  const {timeout = Config.fetchTimeout} = options

  const controller = new AbortController()
  const id = setTimeout(() => {
    console.debug(`Request to ${resource.href} cancelled`)
    return controller.abort()
  }, timeout)

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  })
  clearTimeout(id)

  return response
}

// Previously was using HEAD instead of GET but some website have a proxy blocking it (502 is returned)
export const fetchResponseUrl = async (url: URL, manuelRedirect: boolean): Promise<Response> => {
  const options: any = manuelRedirect
    ? {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        },
      }
    : {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        },
      }
  try {
    return fetchWithTimeout(url, options)
  } catch {
    return Promise.reject(new PageNotFoundException(url))
  }
}

export const fetchUrl = async (url: URL): Promise<string> => {
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    },
  }
  const response = await fetchWithTimeout(url, options)
  const body = await response.text()

  if (response.status >= 200 && response.status < 400) {
    return body
  } else {
    return Promise.reject(new PageNotFoundException(url))
  }
}

export const parseSitemap = async (xml: string): Promise<string[]> => {
  const dom = new jsdom.JSDOM(xml)
  const nodes = dom.window.document.querySelectorAll('loc')

  const res: Promise<string[]>[] = []

  nodes.forEach(node => {
    if (node.textContent) {
      const url = new URL(node.textContent)
      if (url.pathname.endsWith('.xml')) {
        const promise = fetchUrl(url)
          .then(parseSitemap)
          .catch(error => {
            return Promise.resolve([])
          })
        res.push(promise)
      } else {
        res.push(Promise.resolve([node.textContent]))
      }
      // To handle CDATA nodes
      // https://github.com/jsdom/jsdom/issues/618
    } else if (node.childNodes.length > 0 && node.childNodes[0].nodeType === node.COMMENT_NODE) {
      const raw = node.childNodes[0].textContent
      const match = raw?.match(/^\[CDATA\[(.*)\]\]$/)

      if (match && match[1]) {
        const content = match[1]
        const url = new URL(content)
        if (url.pathname.endsWith('.xml')) {
          const promise = fetchUrl(url)
            .then(parseSitemap)
            .catch(error => {
              return Promise.resolve([])
            })
          res.push(promise)
        } else {
          res.push(Promise.resolve([content]))
        }
      }
    }
  })

  return Promise.all(res)
    .then(_ => _.flat())
    .then(_ => _.filter((link, index, self) => self.indexOf(link) === index))
}

export const parseHomepage = (homeURLAsString: string, homepage: string): string[] => {
  const dom = new jsdom.JSDOM(homepage)
  const nodes = dom.window.document.querySelectorAll('a')
  const homeURL = new URL(homeURLAsString)

  const res: string[] = []

  nodes.forEach(node => {
    if (node.href.startsWith('/')) {
      try {
        const url = new URL(homeURLAsString)
        url.pathname = node.href
        res.push(url.toString())
      } catch {}
    } else {
      try {
        const url = new URL(node.href)
        if (url.hostname === homeURL.hostname) {
          res.push(node.href)
        }
      } catch {}
    }
  })

  return res.filter((link, index, self) => self.indexOf(link) === index)
}
