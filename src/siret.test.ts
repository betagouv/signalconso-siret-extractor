import {isSiretValid, isSirenValid, findSiretsOrSirensInPage} from './siret'

describe('Siret or Siren', () => {
  describe('Validate siret', () => {
    test('should validate a wellformed siret', () => {
      expect(isSiretValid('73282932000074')).toBe(true)
    }),
      test('should not validate a malformed siret', () => {
        expect(isSiretValid('83282932000074')).toBe(false)
      }),
      test('should not validate a malformed siret (wrong control digit)', () => {
        expect(isSiretValid('73282932000075')).toBe(false)
      }),
      test('should validate a la poste special case', () => {
        expect(isSiretValid('35600000053945')).toBe(true)
      }),
      test('should validate a la poste special case 2', () => {
        expect(isSiretValid('35600000053954')).toBe(true)
      })
  }),
    describe('Validate siren', () => {
      test('should validate a wellformed siren', () => {
        expect(isSirenValid('732829320')).toBe(true)
      }),
        test('should not validate a malformed siren', () => {
          expect(isSirenValid('832829320')).toBe(false)
        }),
        test('should not validate a malformed siren (wrong control digit)', () => {
          expect(isSirenValid('732829321')).toBe(false)
        })
    }),
    describe('Extract Siret or Siren', () => {
      test('should extract correctly a simple siret', () => {
        const page = 'siret 12345678901234'
        const expected = [[{siret: '12345678901234', valid: false}], []]
        expect(findSiretsOrSirensInPage(page)).toEqual(expected)
      }),
        test('should extract correctly a siret in text', () => {
          const page = 'some SIRET: 12345678901234. Another text.'
          const expected = [[{siret: '12345678901234', valid: false}], []]
          expect(findSiretsOrSirensInPage(page)).toEqual(expected)
        }),
        test('should not extract a number with more than 14 digits', () => {
          const page = 'some SIRET: 123456789012345. Another text.'
          expect(findSiretsOrSirensInPage(page)).toBeNull()
        }),
        test('should extract a formatted siret', () => {
          const page = 'some SIRET: 123 456 789 01234. Another text.'
          const expected = [[{siret: '12345678901234', valid: false}], [{siren: '123456789', valid: false}]]
          expect(findSiretsOrSirensInPage(page)).toEqual(expected)
        }),
        test('should extract several sirets', () => {
          const page = '12345678901234 12345678901235 siret'
          const expected = [
            [
              {siret: '12345678901234', valid: false},
              {siret: '12345678901235', valid: false},
            ],
            [],
          ]
          expect(findSiretsOrSirensInPage(page)).toEqual(expected)
        }),
        test('should handle complex cases', () => {
          const page =
            '12345678901234. do not extract 1234567890123599 some SIRET: 12345678901235. Another text.123 456 789 01236 12345678901237'
          const expected = [
            [
              {siret: '12345678901234', valid: false},
              {siret: '12345678901235', valid: false},
              {siret: '12345678901236', valid: false},
              {siret: '12345678901237', valid: true},
            ],
            [{siren: '123456789', valid: false}],
          ]
          expect(findSiretsOrSirensInPage(page)).toEqual(expected)
        }),
        test('should extract correctly sirens in a TVA numbers', () => {
          const page = 'tva number FR32123456789 FR 00 987 654 321, 111 222333'
          const expected = [
            [],
            [
              {siren: '987654321', valid: false},
              {siren: '111222333', valid: false},
              {siren: '123456789', valid: false},
            ],
          ]
          expect(findSiretsOrSirensInPage(page)).toEqual(expected)
        })
    })
})
