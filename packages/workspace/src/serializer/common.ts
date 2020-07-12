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
import { types } from '@salto-io/lowerdash'

export const CLASS_FIELD = '_salto_class'
export const REF_FIELD = '_salto_ref'

export type HasSerializedClassName = {
  [CLASS_FIELD]: string
}

export const hasSerializedClassName = (
  o: { [CLASS_FIELD]?: string }
): o is HasSerializedClassName => typeof o[CLASS_FIELD] === 'string'


export type NonFunctionProperties<T> = Omit<T, types.FunctionPropertyNames<T>>

export type Ref = {
  [REF_FIELD]: string
}

export const ref = (target: string): Ref => ({ [REF_FIELD]: target })

export const isRef = (o: { [REF_FIELD]?: string }): o is Ref => typeof o[REF_FIELD] === 'string'

export type Ref2 = {
  [REF_FIELD]: number
}

export const isRef2 = (o: { [REF_FIELD]?: string }): o is Ref => typeof o[REF_FIELD] === 'number'
