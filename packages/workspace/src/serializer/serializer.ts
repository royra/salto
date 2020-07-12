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
import {
  NonFunctionProperties,
  HasSerializedClassName,
  ref,
  hasSerializedClassName,
  CLASS_FIELD,
  REF_FIELD,
} from './common'
import {
  isReferenceExpression,
  ElemID,
  InstanceElement,
  ObjectType,
  StaticFile,
  ReferenceExpression, isElement, isStaticFile,
} from '@salto-io/adapter-api'
import {objects} from '@salto-io/lowerdash'

export type PlainObject<T> = NonFunctionProperties<T> & HasSerializedClassName

export type ToPlainObject<
  T,
  V extends NonFunctionProperties<T> = NonFunctionProperties<T>
  > = (v: T) => V

export type Serializer<
  T,
  V extends PlainObject<T> = PlainObject<T>
  > = (v: T) => V

const sortObjectProps = (o: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(
  Object.entries(o).sort(([k1], [k2]) => k1.localeCompare(k2))
)

export const serialize = (
  elements: Iterable<Element>,
  referenceSerializerMode: 'replaceRefWithValue' | 'keepRef' = 'replaceRefWithValue',
): string => {
  const referenceExpressionReplacer = (e: ReferenceExpression): ReferenceExpression => {
    if (e.value === undefined || referenceSerializerMode === 'keepRef') {
      return e.createWithValue(undefined)
    }

    // Replace ref with value in order to keep the result from changing between
    // a fetch and a deploy.
    if (isElement(e.value)) {
      return new ReferenceExpression(e.value.elemID)
    }

    return e.value
  }

  const visited = new Map<unknown, number>()
  const refs: unknown[] = []

  function replacer(this: unknown, propName: string, propValue: any): unknown {
    if (['string', 'number', 'boolean'].includes(typeof propValue)) {
      return propValue
    }

    const existingRefId = visited.get(propValue)
    if (existingRefId !== undefined) {
      return { [REF_FIELD]: existingRefId }
    }

    const refId = refs.push(propValue) - 1

    let result = propValue

    if (isReferenceExpression(result)) {
      result = referenceExpressionReplacer(result)
    } else if (isStaticFile(result)) {
      result = {
        [CLASS_FIELD]: StaticFile[CLASS_FIELD],
        filepath: propValue.filepath,
        hash: propValue.hash,
      }
    }

    if (!result[CLASS_FIELD]) {
      result[CLASS_FIELD] = result?.constructor?.[CLASS_FIELD]
    }

    visited.set(result, refId)

    const isRootObject = propName === ''
    if (isRootObject) {
      return { refs, root: result }
    }
    return result
  }
}
