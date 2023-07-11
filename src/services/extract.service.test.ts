import {SiretOrSiren} from '../models/model'
import {isInList, isInBlacklist} from './extract.service'

describe('Extract service', () => {
  describe('isInList', () => {
    test('should find siren in the list', () => {
      const siren: SiretOrSiren = {
        siren: {siren: '123456789', valid: true},
        links: [],
      }
      expect(isInList(['123456789', '123456781'], siren)).toBe(true)
    }),
      test('should find siret in the list', () => {
        const siret: SiretOrSiren = {
          siret: {siret: '12345678900012', valid: true},
          links: [],
        }
        expect(isInList(['123456789', '123456781'], siret)).toBe(true)
      }),
      test('should not find siren not in the list', () => {
        const siren: SiretOrSiren = {
          siren: {siren: '123456789', valid: true},
          links: [],
        }
        expect(isInList(['123456780', '123456781'], siren)).toBe(false)
      }),
      test('should not find siret not in the list', () => {
        const siret: SiretOrSiren = {
          siret: {siret: '12345678900012', valid: true},
          links: [],
        }
        expect(isInList(['123456780', '123456781'], siret)).toBe(false)
      })
  }),
    describe('isInBlacklist', () => {
      test('should filter siren in the list', () => {
        const siren: SiretOrSiren = {
          siren: {siren: '123456789', valid: true},
          links: [],
        }
        expect(isInBlacklist(['123456789', '123456781'], [siren])).toEqual([])
      }),
        test('should filter siret in the list', () => {
          const siret: SiretOrSiren = {
            siret: {siret: '12345678900012', valid: true},
            links: [],
          }
          expect(isInBlacklist(['123456789', '123456781'], [siret])).toEqual([])
        }),
        test('should not filter siren not in the list', () => {
          const siren: SiretOrSiren = {
            siren: {siren: '123456789', valid: true},
            links: [],
          }
          expect(isInBlacklist(['123456780', '123456781'], [siren]).map(_ => _.siren?.siren)).toEqual(['123456789'])
        }),
        test('should not filter siret not in the list', () => {
          const siret: SiretOrSiren = {
            siret: {siret: '12345678900012', valid: true},
            links: [],
          }
          expect(isInBlacklist(['123456780', '123456781'], [siret]).map(_ => _.siret?.siret)).toEqual(['12345678900012'])
        })
    })
})
