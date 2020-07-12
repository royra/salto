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
import { DefaultMap } from './collections/map'

export class DuplicateKeysError extends Error {
  constructor(readonly duplicates: Record<string, unknown[]>) {
    super(`Duplicate keys in: ${inspect(duplicates)}`)
  }
}

export const fromPairsEnsureUnique = <V>(pairs: [string, V][]): Record<string, V> => {
  const m = new DefaultMap<string, V[]>(() => [])
  const duplicates: Record<string, V[]> = {}
  const result: Record<string, V> = {}
  for (const [key, value] of pairs) {
    const values = m.get(key)
    if (values.push(value) === 2) {
      duplicates[key] = values
    }
    result[key] = value
  }
  if (Object.keys(duplicates).length > 0) {
    throw new DuplicateKeysError(duplicates)
  }
  return result
}
