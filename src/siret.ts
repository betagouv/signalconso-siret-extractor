import jsdom from 'jsdom'
import {SiretsOrSirens, Siren, Siret} from './models/model.js'

const siretRegex = /\b\d{3}(?:\s?\d{3}){2}(?:\s?\d{5})\b/g
const sirenRegex = /\b\d{3}(?:\s?\d{3}){2}\b/g
const tvaNumberRegex = /\bFR(?:\s?\d{2})((?:\s?\d{3}){3})\b/g

const removeWhitespaces = (siret: string): string => siret.replace(/\s/g, '')

export const isSiretValid = (siret: string): boolean => {
  if (siret.length !== 14 || isNaN(Number(siret))) {
    return false
  } else if (siret.slice(0, 9) === '356000000') {
    // 'La poste' special case
    const sum = Array.from(siret).reduce((acc, char) => acc + Number(char), 0)

    return sum % 5 === 0
  } else {
    const sum = Array.from(siret).reduce((acc, char, index) => {
      if (index % 2 === 0) {
        const multBy2 = Number(char) * 2
        return acc + (multBy2 > 9 ? multBy2 - 9 : multBy2)
      } else {
        return acc + Number(char)
      }
    }, 0)
    return sum % 10 === 0
  }
}

export const isSirenValid = (siren: string): boolean => {
  if (siren.length !== 9 || isNaN(Number(siren))) {
    return false
  } else {
    const sum = Array.from(siren).reduce((acc, char, index) => {
      if (index % 2 === 1) {
        const tmp = Number(char) * 2
        return acc + (tmp > 9 ? tmp - 9 : tmp)
      } else {
        return acc + Number(char)
      }
    }, 0)
    return sum % 10 === 0
  }
}

export const findSiretsOrSirensInPage = (page: string | null | undefined): [Siret[], Siren[]] | null => {
  const matchingSirets = page?.match(siretRegex) ?? []
  const matchingSirens = page?.match(sirenRegex) ?? []
  const matchingTVANumbers = [...(page?.matchAll(tvaNumberRegex) ?? [])].map(group => group[1])

  const sirets = matchingSirets.map(removeWhitespaces).map(siret => {
    return {siret, valid: isSiretValid(siret)}
  })
  const sirens = matchingSirens.map(removeWhitespaces)
  const sirensFromTVA = matchingTVANumbers.map(removeWhitespaces)
  const allSirens = [...new Set(sirens.concat(sirensFromTVA))].map(siren => {
    return {siren, valid: isSirenValid(siren)}
  })
  if (sirets.length !== 0 || allSirens.length !== 0) return [sirets, allSirens]
  else return null
}

const naiveInnerText = (node: Node): string => {
  const Node = node // We need Node(DOM's Node) for the constants, but Node doesn't exist in the nodejs global space, and any Node instance references the constants through the prototype chain
  return [...node.childNodes]
    .map(node => {
      switch (node.nodeType) {
        case Node.TEXT_NODE:
          return node.textContent
        case Node.ELEMENT_NODE:
          const htmlElement: HTMLElement = node as HTMLElement
          switch (htmlElement.tagName.toLowerCase()) {
            case 'script':
            case 'style':
            case 'svg':
            case 'meta':
              return ''
            default:
              return naiveInnerText(node)
          }

        default:
          return ''
      }
    })
    .join('\n')
}

export const findSiretsOrSirens = async (
  links: string[],
  fetchPage: (link: URL) => Promise<string>,
): Promise<SiretsOrSirens[]> => {
  const link = links.pop()
  if (link) {
    try {
      const rawPage = await fetchPage(new URL(link))
      const dom = new jsdom.JSDOM(rawPage)
      const body = dom.window.document?.querySelector('body')
      const page = body && naiveInnerText(body)
      const matchingSiretsOrSirens = findSiretsOrSirensInPage(page)
      if (matchingSiretsOrSirens) {
        const [matchingSirets, matchingSirens] = matchingSiretsOrSirens
        const found = {sirets: matchingSirets, sirens: matchingSirens, link}

        const others = await findSiretsOrSirens(links, fetchPage)
        return others.concat(found)
      } else {
        return findSiretsOrSirens(links, fetchPage)
      }
    } catch (error) {
      return findSiretsOrSirens(links, fetchPage)
    }
  }

  return Promise.resolve([])
}
