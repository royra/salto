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

const { encodePrototypes, revivePrototypes } = serialization

describe('prototype', () => {
  const CLASS_NAME_FIELD = '_class_name'
  class Base {
    static [CLASS_NAME_FIELD] = 'Derived'
    base = 'base value'
  }

  class Derived extends Base {
    static [CLASS_NAME_FIELD] = 'Derived'
    derived = 'derived value'
  }

  type HasClassName = { [CLASS_NAME_FIELD]: string; prototype: object }

  const classes: HasClassName[] = [Base, Derived]

  const nameToProto = new Map<string, object>(classes.map(c => [c[CLASS_NAME_FIELD], c.prototype]))
  const protoToName = new Map<object, string>(classes.map(c => [c.prototype, c[CLASS_NAME_FIELD]]))

  const root = [new Base(), new Derived(), { x: 12, y: new Derived() }, 17]

  test('prototype encode and decode', () => {
    const s = JSON.stringify(root, encodePrototypes(protoToName, CLASS_NAME_FIELD))
    const parsed = JSON.parse(s, revivePrototypes(nameToProto, CLASS_NAME_FIELD))
    expect(parsed).toEqual(root)
    const [b, d, { y }] = parsed
    expect(b).toBeInstanceOf(Base)
    expect(b.base).toEqual('base value')
    expect(d).toBeInstanceOf(Base)
    expect(d.base).toEqual('base value')
    expect(b.derived).toEqual('derived value')
    expect(d).toBeInstanceOf(Derived)
    expect(y).toBeInstanceOf(Derived)
  })
})
