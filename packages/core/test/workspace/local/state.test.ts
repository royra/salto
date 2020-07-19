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
import { EOL } from 'os'
import { replaceContents, exists, readTextFile, rm, rename } from '@salto-io/file'
import { ObjectType, ElemID, isObjectType, BuiltinTypes, Element } from '@salto-io/adapter-api'
import { safeJsonStringify } from '@salto-io/adapter-utils'
import { state as wsState } from '@salto-io/workspace'
import { localState } from '../../../src/local-workspace/state'
import { getAllElements } from '../../common/elements'

const mockSerializedElementsStr = '{"prototypes":{"ObjectType":["0"],"ElemID":["0.elemID"]},"refs":{},"data":[{"elemID":{"adapter":"salesforce","typeName":"Activity","idType":"type","nameParts":[]},"annotations":{},"annotationTypes":{},"path":["salesforce","Objects","Activity","ActivityStandardFields"],"fields":{},"isSettings":false}]}'

jest.mock('@salto-io/file', () => ({
  ...jest.requireActual('@salto-io/file'),
  replaceContents: jest.fn().mockImplementation(() => Promise.resolve()),
  readTextFile: jest.fn().mockImplementation((filename: string) => {
    if (filename === 'error') {
      return Promise.resolve('blabl{,.')
    }
    if (filename === 'full') {
      return Promise.resolve(mockSerializedElementsStr)
    }
    if (filename === 'mutiple_adapters') {
      return Promise.resolve('{"prototypes":{"InstanceElement":["0"],"ElemID":["0.elemID","0.type.elemID","0.type.annotationTypes.metadataType.elemID","0.type.annotationTypes.hasMetaFile.elemID","0.type.annotationTypes.folderType.elemID","0.type.fields.fullName.elemID"],"ObjectType":["0.type"],"PrimitiveType":["0.type.annotationTypes.metadataType","0.type.annotationTypes.hasMetaFile","0.type.annotationTypes.folderType"],"Field":["0.type.fields.fullName"]},"refs":{"0.type.annotationTypes.hasMetaFile":["0.type.annotationTypes.isFolder"],"0.type":["0.type.fields.fullName.parent"],"0.type.annotationTypes.metadataType":["0.type.fields.fullName.type"]},"data":[{"elemID":{"adapter":"hubspot","typeName":"ArchiveSettings","idType":"instance","nameParts":["_config"]},"annotations":{},"annotationTypes":{},"path":["salesforce","Records","Settings","Archive"],"type":{"elemID":{"adapter":"salesforce","typeName":"ArchiveSettings","idType":"type","nameParts":[]},"annotations":{"metadataType":"ArchiveSettings","_hidden":true},"annotationTypes":{"metadataType":{"elemID":{"adapter":"","typeName":"serviceid","idType":"type","nameParts":[]},"annotations":{},"annotationTypes":{},"primitive":0},"hasMetaFile":{"elemID":{"adapter":"","typeName":"boolean","idType":"type","nameParts":[]},"annotations":{},"annotationTypes":{},"primitive":2},"folderType":{"elemID":{"adapter":"","typeName":"string","idType":"type","nameParts":[]},"annotations":{},"annotationTypes":{},"primitive":0}},"path":["salesforce","Types","ArchiveSettings"],"fields":{"fullName":{"elemID":{"adapter":"salesforce","typeName":"ArchiveSettings","idType":"field","nameParts":["fullName"]},"annotations":{"_required":false},"annotationTypes":{},"name":"fullName"}},"isSettings":true},"value":{"fullName":"Archive"}}]}\n{ "salto" :"2020-04-21T09:44:20.824Z", "hubspot":"2020-04-21T09:44:20.824Z"}')
    }
    return Promise.resolve('{"prototypes":{},"refs":{},"data":[]}')
  }),
  rm: jest.fn().mockImplementation(),
  rename: jest.fn().mockImplementation(),
  mkdirp: jest.fn().mockImplementation(),
  exists: jest.fn().mockImplementation(((filename: string) => Promise.resolve(filename !== 'empty'))),
}))

describe('local state', () => {
  let mockElement: ObjectType
  let mockElement2: ObjectType

  beforeEach(() => {
    [mockElement, mockElement2] = getAllElements().filter(isObjectType) as ObjectType[]
  })

  const replaceContentMock = replaceContents as jest.Mock
  const readTextFileMock = readTextFile as unknown as jest.Mock

  describe('empty state', () => {
    let state: wsState.State
    beforeEach(() => {
      state = localState('empty')
    })
    it('should return an empty array if there is no saved state', async () => {
      const result = await state.getAll()
      expect(result.length).toBe(0)
    })

    it('should override state successfully, retrieve it and get the same result', async () => {
      const newElem = new ObjectType({ elemID: new ElemID('mock_adapter', 'new') })
      state.set(newElem)
      await state.override([mockElement])
      const retrievedState = await state.getAll()
      expect(retrievedState.length).toBe(1)
      const retrievedStateObjectType = retrievedState[0] as ObjectType
      expect(retrievedStateObjectType.isEqual(mockElement)).toBe(true)
    })

    it('should set state successfully, retrieve it and get the same result', async () => {
      await state.set(mockElement)
      const retrievedState = await state.getAll()
      expect(retrievedState.length).toBe(1)
      const retrievedStateObjectType = retrievedState[0] as ObjectType
      expect(retrievedStateObjectType.isEqual(mockElement)).toBe(true)
    })

    it('should update state', async () => {
      await state.set(mockElement)
      const clone = mockElement.clone()
      const newField = Object.values(mockElement.fields)[0]
      newField.name = 'new_field'
      clone.fields.newfield = newField
      state.set(clone)

      const fromState = await state.get(mockElement.elemID) as ObjectType
      expect(fromState.fields.newfield).toBeDefined()
    })

    it('should add to state', async () => {
      await state.set(mockElement)
      const newElem = new ObjectType({ elemID: new ElemID('mock_adapter', 'new') })
      state.set(newElem)

      const fromState = await state.getAll()
      expect(fromState.length).toBe(2)
      expect(fromState[1].elemID.name).toBe('new')
    })

    it('should remove from state', async () => {
      await state.set(mockElement)
      let fromState = await state.getAll()
      expect(fromState.length).toBe(1)

      await state.remove(mockElement.elemID)
      fromState = await state.getAll()
      expect(fromState.length).toBe(0)
    })
  })

  it('should read valid state file', async () => {
    const state = localState('full')
    const elements = await state.getAll()
    expect(elements).toHaveLength(1)
  })

  it('should throw an error if the state nacl file is not valid', async () => {
    const state = localState('error')
    await expect(state.getAll()).rejects.toThrow()
  })

  const findReplaceContentCall = (filename: string): unknown[] =>
    replaceContentMock.mock.calls.find(c => c[0] === filename)

  it('should write a stable list of elements on flush', async () => {
    const serializedElements = async (elements: Element[]): Promise<string> => {
      const state = localState('on-flush')
      await Promise.all(elements.map(e => state.set(e)))
      await state.flush()
      const onFlush = findReplaceContentCall('on-flush')
      expect(onFlush).toBeDefined()
      return onFlush[1] as string
    }
    const ser1 = await serializedElements([mockElement, mockElement2])
    const ser2 = await serializedElements([mockElement2, mockElement])
    expect(ser1).toEqual(ser2)
  })

  it('should write file on flush', async () => {
    const state = localState('on-flush')
    await state.set(mockElement)
    await state.flush()
    const onFlush = findReplaceContentCall('on-flush')
    expect(onFlush).toBeDefined()
    expect((onFlush[1] as string).split(EOL).slice(1)).toEqual([
      safeJsonStringify({}),
      safeJsonStringify([]),
    ])
  })

  it('shouldn\'t write file if state was not loaded on flush', async () => {
    const state = localState('not-flush')
    await state.flush()
    expect(findReplaceContentCall('not-flush')).toBeUndefined()
  })

  describe('getUpdateDate', () => {
    const mockExists = exists as jest.Mock
    const saltoModificationDate = new Date(2010, 10, 10)
    const hubspotModificationDate = new Date(2011, 10, 10)
    const mockStateStr = [
      mockSerializedElementsStr,
      safeJsonStringify({ salto: saltoModificationDate, hubspot: hubspotModificationDate }),
      safeJsonStringify([]),
    ].join(EOL)

    it('should return an empty object when the state does not exist', async () => {
      mockExists.mockResolvedValueOnce(false)
      const state = localState('filename')
      const date = await state.getServicesUpdateDates()
      expect(date).toEqual({})
    })
    it('should return empty object when the updated date is not set', async () => {
      mockExists.mockResolvedValueOnce(true)
      const state = localState('filename')
      const date = await state.getServicesUpdateDates()
      expect(date).toEqual({})
    })
    it('should return the modification date of the state', async () => {
      mockExists.mockResolvedValueOnce(true)
      readTextFileMock.mockResolvedValueOnce(mockStateStr)
      const state = localState('filename')
      const date = await state.getServicesUpdateDates()
      expect(date.salto).toEqual(saltoModificationDate)
      expect(date.hubspot).toEqual(hubspotModificationDate)
    })
    it('should update modification date on override', async () => {
      mockExists.mockResolvedValueOnce(true)
      readTextFileMock.mockResolvedValueOnce(mockStateStr)
      const now = new Date(2013, 6, 4).getTime()
      jest.spyOn(Date, 'now').mockReturnValue(now)
      const state = localState('filename')

      const beforeOverrideDate = await state.getServicesUpdateDates()
      expect(beforeOverrideDate.salto).toEqual(saltoModificationDate)
      expect(beforeOverrideDate.hubspot).toEqual(hubspotModificationDate)
      await state.override([mockElement])
      const overrideDate = await state.getServicesUpdateDates()
      expect(overrideDate.salto.getTime()).toBe(now)
      expect(beforeOverrideDate.hubspot).toEqual(hubspotModificationDate)
    })
    it('should not update modification date on set/remove', async () => {
      mockExists.mockResolvedValueOnce(true)
      readTextFileMock.mockResolvedValueOnce(mockStateStr)
      const state = localState('filename')

      await state.set(mockElement)
      const overrideDate = await state.getServicesUpdateDates()
      expect(overrideDate.salto).toEqual(saltoModificationDate)
      expect(overrideDate.hubspot).toEqual(hubspotModificationDate)
      await state.remove(mockElement.elemID)
      expect(overrideDate.salto).toEqual(saltoModificationDate)
      expect(overrideDate.hubspot).toEqual(hubspotModificationDate)
    })
    it('should ignore built in types in set ops', async () => {
      mockExists.mockResolvedValueOnce(true)
      const state = localState('empty')
      await state.set(BuiltinTypes.STRING)
      const overrideDate = await state.getServicesUpdateDates()
      expect(overrideDate).toEqual({})
    })
  })

  describe('clear', () => {
    const mockRm = rm as jest.Mock
    it('should delete state file', async () => {
      const state = localState('on-delete')
      await state.clear()
      expect(mockRm).toHaveBeenCalledTimes(1)
      expect(mockRm).toHaveBeenCalledWith('on-delete')
    })
  })

  describe('rename', () => {
    const mockRename = rename as jest.Mock
    const filePath = '/base/old.jsonl'

    it('should rename state file', async () => {
      const state = localState(filePath)
      await state.rename('new')
      expect(mockRename).toHaveBeenCalledTimes(1)
      expect(mockRename).toHaveBeenCalledWith(filePath, '/base/new.jsonl')
    })
  })

  describe('exsitingAdapters', () => {
    it('should return empty list on empty state', async () => {
      const state = localState('empty')
      const adapters = await state.existingServices()
      expect(adapters).toHaveLength(0)
    })
    it('should return all adapters in a full state', async () => {
      const state = localState('mutiple_adapters')
      const adapters = await state.existingServices()
      expect(adapters).toEqual(['salto', 'hubspot'])
    })
  })
})
