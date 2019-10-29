import { MetadataInfo, SaveResult } from 'jsforce'
import _ from 'lodash'
import { FIELD_TYPE_NAMES, FIELD_TYPE_API_NAMES } from '../constants'


export interface FieldPermissions {
  field: string
  editable: boolean
  readable: boolean
}

export class ProfileInfo implements MetadataInfo {
  constructor(
    public readonly fullName: string,
    public fieldPermissions: FieldPermissions[] = []
  ) {}
}


class CustomPicklistValue implements MetadataInfo {
  readonly default: boolean
  constructor(public readonly fullName: string, isDefault: boolean, readonly label?: string) {
    if (!this.label) {
      this.label = fullName
    }
    this.default = isDefault
  }
}

export interface FilterItem {
  field: string
  operation: string
  valueField: string
}

export interface LookupFilter {
  active: boolean
  booleanFilter: string
  errorMessage: string
  filterItems: FilterItem[]
  infoMessage: string
  isOptional: boolean
}

export class CustomField implements MetadataInfo {
  // Common field annotations
  readonly type: string
  readonly required?: boolean
  readonly defaultValue?: string
  // For formula fields
  readonly formula?: string
  // To be used for picklist and combobox types
  readonly valueSet?: { valueSetDefinition: { value: CustomPicklistValue[] } }
  // To be used for lookup and masterdetail types
  readonly referenceTo?: string[]
  readonly relationshipName?: string
  readonly deleteConstraint?: string
  readonly reparentableMasterDetail?: boolean
  readonly writeRequiresMasterRead?: boolean
  readonly lookupFilter?: LookupFilter

  // To be used for Text types fields
  readonly length?: number

  // For the rest of the annotation values required by the rest of the field types:
  scale?: number
  precision?: number
  displayFormat?: string
  unique?: boolean
  caseSensitive?: boolean
  displayLocationInDecimal?: boolean
  visibleLines?: number
  maskType?: string
  maskChar?: string

  constructor(
    public fullName: string,
    type: string,
    readonly label?: string,
    required = false,
    defaultVal?: string,
    defaultValFormula?: string,
    values?: string[],
    formula?: string,
    relatedTo?: string[],
    relationshipName?: string,
    allowLookupRecordDeletion?: boolean,
  ) {
    this.type = type
    if (formula) {
      this.formula = formula
    } else {
      switch (this.type) {
        case 'Text':
          this.length = 80
          break
        case 'LongTextArea':
        case 'Html':
          this.length = 32768
          break
        case 'EncryptedText':
          this.length = 32
          break
        default:
          break
      }
      this.required = required
    }

    if (defaultValFormula) {
      this.defaultValue = defaultValFormula
    }

    // For Picklist we save the default value in defaultVal but Metadata requires it at Value level
    if (type === FIELD_TYPE_API_NAMES[FIELD_TYPE_NAMES.PICKLIST]
      || type === FIELD_TYPE_API_NAMES[FIELD_TYPE_NAMES.MULTIPICKLIST]) {
      if (values && !_.isEmpty(values)) {
        this.valueSet = {
          valueSetDefinition: {
            value: values.map(val => new CustomPicklistValue(val, val === defaultVal)),
          },
        }
      }
    } else if (type === FIELD_TYPE_API_NAMES[FIELD_TYPE_NAMES.CHECKBOX]) {
      // For Checkbox the default value comes from defaultVal and not defaultValFormula
      this.defaultValue = defaultVal
    } else if (type === FIELD_TYPE_API_NAMES[FIELD_TYPE_NAMES.LOOKUP]) {
      this.relationshipName = relationshipName
      this.deleteConstraint = allowLookupRecordDeletion ? 'SetNull' : 'Restrict'
      this.referenceTo = relatedTo
    } else if (type === FIELD_TYPE_API_NAMES[FIELD_TYPE_NAMES.MASTER_DETAIL]) {
      this.relationshipName = relationshipName
      this.referenceTo = relatedTo
    }
  }
}

export class CustomObject implements MetadataInfo {
  readonly pluralLabel: string
  readonly fields?: CustomField[] | CustomField

  readonly deploymentStatus = 'Deployed'
  readonly sharingModel: string
  readonly nameField = {
    type: 'Text',
    label: 'Test Object Name',
  }

  constructor(
    readonly fullName: string,
    readonly label: string,
    fields?: CustomField[]
  ) {
    this.pluralLabel = `${this.label}s`
    if (fields) {
      this.fields = fields
    }

    const hasMasterDetailField = (): boolean|undefined => fields
      && fields.some(field => field.type === FIELD_TYPE_API_NAMES[FIELD_TYPE_NAMES.MASTER_DETAIL])

    if (hasMasterDetailField()) {
      this.sharingModel = 'ControlledByParent'
    } else {
      this.sharingModel = 'ReadWrite'
    }
  }
}

export interface SfError {
  extendedErrorDetails: string[]
  extendedErrorCode: number[]
  fields: string[]
  message: string
  statusCode: number
}

export interface CompleteSaveResult extends SaveResult {
  success: boolean
  fullName: string
  errors: SfError | SfError[]
}
