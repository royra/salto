/*
*                      Copyright 2020 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import { objects } from '../src'

const { fromPairsEnsureUnique } = objects

describe('objects', () => {
  describe('fromPairsEnsureUnique', () => {
    describe('when given an empty pairs list', () => {
      it('should return an empty object', () => {
        expect(fromPairsEnsureUnique([])).toEqual({})
      })
    })

    describe('when given a unique pairs list', () => {
      it('should return an object', () => {
        expect(fromPairsEnsureUnique([['x', 12], ['y', 13]])).toEqual({ x: 12, y: 13 })
      })
    })

    describe('when given a non-unique pairs list', () => {
      const shouldThrow = (): Record<string, number> => fromPairsEnsureUnique([
        ['x', 12],
        ['y', 12],
        ['y', 13],
        ['z', 14],
        ['z', 15],
        ['z', 16],
      ])

      it('should throw', () => {
        expect(shouldThrow).toThrow(objects.DuplicateKeysError)
      })

      describe('the thrown exception', () => {
        let thrown: objects.DuplicateKeysError
        beforeEach(() => {
          try {
            shouldThrow()
          } catch (e) {
            thrown = e
          }
        })

        it('should contain the duplicate keys and values', () => {
          expect(thrown.duplicates).toEqual({
            y: [12, 13],
            z: [14, 15, 16],
          })
        })
      })
    })
  })
})
