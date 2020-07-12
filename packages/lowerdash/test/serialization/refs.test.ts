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

import { serialization } from '../../src'

type WithRefs = serialization.WithRefs

const { refsReplacer, resolveRefs } = serialization

describe('refs', () => {
  const o1 = { x: 12, y: 13 }
  const o2 = { x: 14, y: 15 }

  const testRoundtrip = (description: string, rootFactory: () => unknown): void => {
    test(`when given ${description}`, () => {
      const root = rootFactory()
      const s = JSON.stringify(root, refsReplacer())
      const parsed = resolveRefs(JSON.parse(s) as WithRefs)
      expect(parsed).toEqual(root)
    })
  }

  testRoundtrip('a single scalar', () => 12)

  testRoundtrip('no duplicate refs', () => {
    const el1 = { o1 }
    const el2 = { o2, z: 16 }
    return [el1, el2]
  })

  testRoundtrip('a duplicate ref', () => {
    const el1 = { o1 }
    const el2 = { o1, o2, z: 16 }
    return [el1, el2]
  })

  testRoundtrip('a deep duplicate ref', () => {
    const el1 = { o1 }
    const el2 = { foo: { bar: { baz: o1 } }, o2, z: 16 }
    return [el1, el2]
  })

  testRoundtrip('a circular ref', () => {
    const el1 = { o1 }
    const el2 = { o1, o2, z: 16 }
    Object.assign(el1, { el2 })
    Object.assign(el2, { el1 })
    return [el1, el2]
  })

  testRoundtrip('a duplicate ref whose name contains a dot', () => {
    const nameWithDot = 'name.dot'
    const el1 = { [nameWithDot]: o1 }
    const el2 = { [nameWithDot]: o1, o2, z: 16 }
    return [el1, el2]
  })

  describe('when a custom replacer is specified', () => {
    const el1 = { o1 }
    const el2 = { o1, o2, z: 16 }
    const el3 = { o1, o2, z: 16 }
    const root = [el1, el2, el3]
    function replacer(this: unknown, k: string, v: unknown): unknown {
      if (this === el2 && k === 'o1' && v === o1) {
        return 17
      }
      return v
    }

    let replacerSpy: jest.Mock
    let parsed: unknown

    beforeEach(() => {
      replacerSpy = jest.fn(replacer)
      const s = JSON.stringify(root, refsReplacer(replacerSpy))
      parsed = resolveRefs(JSON.parse(s) as WithRefs)
    })

    it('should call it correctly', () => {
      expect(parsed).toEqual([
        el1,
        { o1: 17, o2, z: 16 },
        el3,
      ])
    })
  })
})
