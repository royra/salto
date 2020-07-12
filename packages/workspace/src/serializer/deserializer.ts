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
import {
  ElemID,
  Element,
  InstanceElement, ObjectType, StaticFile, isStaticFile, isElement,
} from '@salto-io/adapter-api'
import { objects, collections } from '@salto-io/lowerdash'
import {
  NonFunctionProperties,
  CLASS_FIELD,
  HasSerializedClassName,
  isRef,
  REF_FIELD,
  Ref,
  hasSerializedClassName,
} from './common'
import { InvalidStaticFile } from '../workspace/static_files/common'

export type PlainObject<T> = NonFunctionProperties<T>

export type Deserializer<
  T,
  V extends PlainObject<T> = PlainObject<T>
> = (v: V) => T

export type StaticFileReviver =
  (staticFile: StaticFile) => Promise<StaticFile | InvalidStaticFile>

const deserializeElemId = (
  v: NonFunctionProperties<ElemID>,
): ElemID => Object.setPrototypeOf(v, ElemID.prototype)

const deserializeElement = <
  T extends { elemID: ElemID },
  V extends NonFunctionProperties<T> = NonFunctionProperties<T>,
>(
    c: { new(...args: never[]): T },
    v: V
  ): T => Object.setPrototypeOf(
    Object.assign(v, {
      elemID: deserializeElemId(
        // @ts-ignore
        v.elemID,
      ),
    }),
    c.prototype,
  )

const deserializerPair = <
  T,
  V extends NonFunctionProperties<T> = NonFunctionProperties<T>,
>(
    c: HasSerializedClassName & { new(...args: never[]): T },
    f: (v: V) => T
  ): [string, Deserializer<T, V>] => [c[CLASS_FIELD], f]

type UnresolvedRef = { object: unknown, propName: string }

export const deserialize = async (
  data: string,
  staticFileReviver?: StaticFileReviver,
): Promise<Element[]> => {
  const deserializers = objects.fromPairsEnsureUnique<unknown>([
    deserializerPair(InstanceElement, v => deserializeElement(InstanceElement, v)),
    deserializerPair(ObjectType, v => deserializeElement(ObjectType, v)),
    deserializerPair(StaticFile, v => ),
  ])

  const elementsMap = new Map<string, unknown>()
  const unresolvedRefsMap = new collections.map.DefaultMap<string, UnresolvedRef[]>(() => [])
  const addUnresolvedRef = (target: string, object: unknown, propName: string): void => {
    unresolvedRefsMap.get(target).push({ object, propName })
  }

  const staticFilePromises: Promise<void>[] = []

  const tryResolveRef = (object: unknown, propName: string, propValue: Ref): unknown => {
    const refTarget = propValue[REF_FIELD]
    const e = elementsMap.get(refTarget)
    if (e) {
      return e
    } else {
      addUnresolvedRef(refTarget, object, propName)
      return propValue
    }
  }

  const trySetPrototype = (v: { [CLASS_FIELD]?: string }): unknown => {
    if (!hasSerializedClassName(v)) {
      return v
    }

    const deserializer = deserializers[v[CLASS_FIELD]] as Deserializer<unknown>
    if (deserializer) {
      return deserializer(v)
    }
  }

  const onElementDeserialized = (element: Element, propName: string): void => {
    const fullName = element.elemID.getFullName()
    const existingElement = elementsMap.get(fullName)
    if (existingElement) {
      throw new Error(`duplicate element ID "${fullName}": ${inspect(existingElement)} while deserializing property ${propName} of: ${inspect(element)}`)
    }
    elementsMap.set(fullName, element)
    const unresolvedRefs = unresolvedRefsMap.get(fullName)
    if (unresolvedRefs) {
      unresolvedRefs.forEach(({ object, propName: targetPropName }) => Object.assign(
        object,
        { [targetPropName]: element },
      ))
      unresolvedRefsMap.delete(fullName)
    }
  }

  const onStaticFileDeserialized = (staticFile: StaticFile, parent: unknown, propName: string): void => {
    if (!staticFileReviver) {
      return
    }
    staticFilePromises.push(staticFileReviver(staticFile).then(r => {
      Object.assign(parent, { [propName]: r })
    }))
  }

  function reviver(this: unknown, propName: string, propValue: any): any {
    if (isRef(propValue)) {
      return tryResolveRef(this, propName, propValue)
    }

    const result = trySetPrototype(propValue)

    if (isElement(result)) {
      onElementDeserialized(result, propName)
    }

    if (isStaticFile(result)) {
      onStaticFileDeserialized(result, this, propName)
    }

    return result
  }

  const elements = JSON.parse(data, reviver) as Element[]

  if (unresolvedRefsMap.size > 0) {
    throw new Error(`Unresolved refs: ${inspect(unresolvedRefsMap)}`)
  }

  await Promise.all(staticFilePromises)

  return elements
}
