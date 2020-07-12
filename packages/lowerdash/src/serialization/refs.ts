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
import { DefaultMap } from '../collections/map'
import { Replacer, isPrimitive } from './common'

export type WithRefs = {
  root: unknown
  refs: Record<string, string[]>
}

const NULL_REPLACER: Replacer = (_propName: string, propValue: unknown) => propValue

export type RefPath = string[]

type Node = {
  [key: string]: Node | unknown
}

const navigateTo = (root: Node, path: string): [string, Node] => {
  const parts = path.split(/(?<!\\)\./).map(p => p.replace(/\\\./g, '.'))
  let o = root
  for (let i = 0; i < parts.length - 1; i += 1) {
    o = o[parts[i]] as Node
  }
  return [parts[parts.length - 1], o]
}

const getRef = (root: Node, path: string): unknown => {
  const [propName, object] = navigateTo(root, path)
  return object[propName]
}

const setRef = (root: Node, path: string, value: unknown): void => {
  const [propName, object] = navigateTo(root, path)
  object[propName] = value
}

const serializeRef = (paths: string[]): string => paths
  .map(p => p.replace(/\./g, '\\.'))
  .join('.')

export const refsReplacer = (
  innerReplacer: Replacer = NULL_REPLACER,
): Replacer => {
  const visited = new Map<unknown, RefPath>()
  const refs = new DefaultMap<string, string[]>(() => [])

  const rootResult: Omit<WithRefs, 'refs'> & { refs: DefaultMap<string, string[]> } = { root: undefined, refs }
  let visitedRefs = false

  const addRef = (targetPath: string[], refPath: string[]): void => {
    refs.get(serializeRef(targetPath)).push(serializeRef(refPath))
  }

  function replacer(this: unknown, propName: string, propValue: unknown): unknown {
    // console.log('replacer, this=%o, propName=%o propValue=%o', this, propName, propValue)
    if (visitedRefs) { // somewhere inside refs
      return propValue
    }

    if (rootResult.refs === propValue) { // refs prop
      visitedRefs = true
      return Object.fromEntries(refs.entries())
    }

    const result = innerReplacer.call(this, propName, propValue)

    if (rootResult.root === undefined) { // root object - replace with WithRefs
      rootResult.root = result
      return rootResult
    }

    if (rootResult.root === result) { // no need to process root
      return result
    }

    if (isPrimitive(result)) {
      return result
    }

    const parentRefPath = visited.get(this)
    const refPath = [...parentRefPath ?? [], propName]

    const visitedRefPath = visited.get(result)

    if (visitedRefPath === undefined) {
      visited.set(result, refPath)
      return result
    }

    addRef(visitedRefPath, refPath)
    return undefined
  }

  return replacer
}

export const resolveRefs = (
  { refs, root }: WithRefs,
): unknown => {
  Object.entries(refs).forEach(([targetPathStr, refPaths]) => {
    const target = getRef(root as Node, targetPathStr)
    refPaths.forEach(refPathStr => {
      setRef(root as Node, refPathStr, target)
    })
  })
  return root
}
