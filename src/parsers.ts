import jsdom from 'jsdom'
import {PageNotFoundException, WebsiteNotFoundException} from './utils/exceptions.js'

export const headUrl = async (url: URL, manuelRedirect: boolean): Promise<Response> => {
  const options: any = manuelRedirect ? {method: 'HEAD', redirect: 'manual'} : {method: 'HEAD'}
  try {
    return fetch(url, options)
  } catch {
    return Promise.reject(new PageNotFoundException(url))
  }
}

export const fetchUrl = async (url: URL): Promise<string> => {
  const response = await fetch(url)
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
