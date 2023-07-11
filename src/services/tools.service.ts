import {exec} from 'child_process'

const lookup = (domain: string): Promise<string> => {
  const cmd = `dig +nocmd ${domain} 'A' +noall +answer ${domain} 'AAAA' +noall +answer`

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error || stderr) {
        reject('DNS lookup failed')
      }
      resolve(stdout)
    })
  })
}

export const dig = (website: string): Promise<string> => {
  try {
    const domain = new URL(website).hostname
    return lookup(domain)
  } catch {
    return lookup(website)
  }
}
