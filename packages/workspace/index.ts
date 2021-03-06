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
import * as errors from './src/errors'
import * as nacl from './src/workspace/nacl_files'
import { Workspace, SourceFragment, StateRecency, loadWorkspace,
  EnvironmentsSources, initWorkspace } from './src/workspace/workspace'
import * as hiddenValues from './src/workspace/hidden_values'
import * as configSource from './src/workspace/config_source'
import * as workspaceConfig from './src/workspace/config'
import { State } from './src/workspace/state'
import * as dirStore from './src/workspace/dir_store'
import * as parseCache from './src/workspace/cache'
import * as staticFiles from './src/workspace/static_files'
import * as parser from './src/parser'
import * as merger from './src/merger'
import * as expressions from './src/expressions'
import * as serialization from './src/serializer/elements'
import * as pathIndex from './src/workspace/path_index'

export {
  errors,
  hiddenValues,
  serialization,
  parser,
  merger,
  dirStore,
  parseCache,
  configSource,
  workspaceConfig,
  staticFiles,
  expressions,
  nacl,
  pathIndex,
  // Workspace exports
  Workspace,
  SourceFragment,
  StateRecency,
  loadWorkspace,
  EnvironmentsSources,
  initWorkspace,
  State,
}
