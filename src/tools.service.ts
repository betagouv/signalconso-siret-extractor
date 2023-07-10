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

export const dig = (websiteURL: string): Promise<string> => {
  const domain = new URL(websiteURL).hostname
  return lookup(domain)
}
