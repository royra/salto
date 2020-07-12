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
import { inspect } from 'util'
import { Replacer, Reviver, isPrimitive } from './common'

export const encodePrototypes = (
  prototypes: Map<object, string>,
  prototypeFieldName: string,
): Replacer => (_propName: string, propValue: unknown): unknown => {
  if (isPrimitive(propValue)) {
    return propValue
  }
  const prototypeFieldValue = prototypes.get(Object.getPrototypeOf(propValue))
  if (prototypeFieldValue === undefined) {
    return propValue
  }
  return Object.assign(propValue, { [prototypeFieldName]: prototypeFieldValue })
}

class UnknownPrototypeError extends Error {
  constructor(
    readonly prototypeKey: string,
    readonly object: unknown,
    readonly propName: string,
  ) {
    super(`unknown prototype "${prototypeKey}" while reviving "${propName}" in object ${inspect(object)}`)
  }
}

export const revivePrototypes = (
  prototypes: Map<string, object>,
  prototypeFieldName: string,
): Reviver => {
  function reviver(this: unknown, propName: string, propValue: never): unknown {
    if (isPrimitive(propValue)) {
      return propValue
    }
    if (!(prototypeFieldName in propValue) || typeof propValue[prototypeFieldName] !== 'string') {
      return propValue
    }

    const prototype = prototypes.get(propValue[prototypeFieldName])
    if (prototype === undefined) {
      throw new UnknownPrototypeError(propValue[prototypeFieldName], this, propName)
    }
    return Object.setPrototypeOf(propValue, prototype)
  }

  return reviver as Reviver
}
