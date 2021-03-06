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
export type File = {
  filename: string
  buffer: string
  timestamp?: number
}

export type DirectoryStore = {
  list(): Promise<string[]>
  get(filename: string): Promise<File | undefined>
  set(file: File): Promise<void>
  delete(filename: string): Promise<void>
  clear(): Promise<void>
  rename(name: string): Promise<void>
  renameFile(name: string, newName: string): Promise<void>
  flush(): Promise<void>
  mtimestamp(filename: string): Promise<number | undefined>
  getFiles(filenames: string[]): Promise<(File | undefined) []>
  getTotalSize(): Promise<number>
  clone(): DirectoryStore
}

export type SyncDirectoryStore = DirectoryStore & {
  getSync(filename: string): File | undefined
}
