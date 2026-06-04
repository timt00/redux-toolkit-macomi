import ApiGenerator from 'oazapfts/generate';
import type { SchemaObject } from 'oazapfts/generate';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { TypeNode } from 'typescript';
import typescript, { __String } from 'typescript';

import type { UuidHandlingOptions } from '../types';
import ts from 'typescript';
import lodash, { camelCase } from 'lodash';

function safeKey(value: string): string {
  return lodash.upperFirst(
    camelCase(value)
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1')
  );
}

export class CustomApiGenerator extends ApiGenerator {
  uuidHandlingOptions: UuidHandlingOptions | null;
  allPropertiesRequired: boolean;
  transformDates: boolean;
  hasUsedGuids: boolean = false;
  enums: Map<string, string[]> | undefined;

  constructor(
    uuidHandlingOptions: UuidHandlingOptions | null,
    allPropertiesRequired: boolean,
    transformDates: boolean,
    spec: OpenAPIV3.Document<{}>,
    opts?: any
  ) {
    super(spec, opts);
    this.uuidHandlingOptions = uuidHandlingOptions;
    this.allPropertiesRequired = allPropertiesRequired;
    this.transformDates = transformDates;
  }

  override getBaseTypeFromSchema(
    schema?:
      | OpenAPIV3.ReferenceObject
      | (OpenAPIV3.SchemaObject & {
          const?: unknown;
          'x-enumNames'?: string[] | undefined;
          'x-enum-varnames'?: string[] | undefined;
          'x-component-ref-path'?: string | undefined;
          prefixItems?: (OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & any))[] | undefined;
        })
      | undefined,
    name?: string | undefined,
    onlyMode?: ('readOnly' | 'writeOnly') | undefined
  ): TypeNode {
    if (this.uuidHandlingOptions) {
      const baseObj = schema as OpenAPIV3.BaseSchemaObject;

      if (baseObj && baseObj.format) {
        if (baseObj.format === 'uuid') {
          this.hasUsedGuids = true;
          return typescript.factory.createTypeReferenceNode(this.uuidHandlingOptions.typeName, undefined);
        }
      }
    }

    if (this.transformDates) {
      const baseObj = schema as OpenAPIV3.BaseSchemaObject;

      if (baseObj && baseObj.format === 'date-time') {
        return typescript.factory.createTypeReferenceNode('Date', undefined);
      }
    }

    return super.getBaseTypeFromSchema(schema, name, onlyMode);
  }

  override getTypeFromProperties(
    props: {
      [prop: string]:
        | OpenAPIV3.ReferenceObject
        | (OpenAPIV3.SchemaObject & {
            const?: unknown;
            'x-enumNames'?: string[] | undefined;
            'x-enum-varnames'?: string[] | undefined;
            'x-component-ref-path'?: string | undefined;
            prefixItems?: (OpenAPIV3.ReferenceObject | (OpenAPIV3.SchemaObject & any))[] | undefined;
          });
    },
    required?: string[] | undefined,
    additionalProperties?: boolean | OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined,
    onlyMode?: ('readOnly' | 'writeOnly') | undefined
  ): typescript.TypeLiteralNode {
    const propertyNames = Object.keys(props);
    return super.getTypeFromProperties(
      props,
      this.allPropertiesRequired ? propertyNames : required,
      additionalProperties,
      onlyMode
    );
  }

  override preprocessComponents(schemas: {
    [key: string]: OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject | SchemaObject;
  }): void {
    super.preprocessComponents(schemas);
    this.enums ??= new Map<string, string[]>();
    for (const schemaKey of Object.keys(schemas)) {
      const schema = schemas[schemaKey] as any;
      if (schema.enum) {
        this.enums.set(schemaKey, schema.enum as string[]);
      }
    }
  }

  createTsEnumStatements(enumName: string): ts.Statement[] {
    const en = this.enums?.get(enumName);
    if (!en) throw new Error(`Enum ${enumName} not found!`);
    const enumValuesName = `${enumName}`;
    const constStmt = ts.factory.createVariableStatement(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            enumValuesName,
            undefined,
            undefined,
            ts.factory.createAsExpression(
              ts.factory.createObjectLiteralExpression(
                en.map((v) => ts.factory.createPropertyAssignment(safeKey(v), ts.factory.createStringLiteral(v))),
                true
              ),
              ts.factory.createTypeReferenceNode('const')
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    );
    const typeAlias = ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      enumName,
      undefined,
      ts.factory.createIndexedAccessTypeNode(
        ts.factory.createTypeQueryNode(ts.factory.createIdentifier(enumValuesName)),
        ts.factory.createTypeOperatorNode(
          ts.SyntaxKind.KeyOfKeyword,
          ts.factory.createTypeQueryNode(ts.factory.createIdentifier(enumValuesName))
        )
      )
    );
    return [constStmt, typeAlias];
  }

  override resolve<T>(obj: OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject | T): T {
    return super.resolve<T>(obj);
  }

  override getTypeFromParameter(p: OpenAPIV3.ParameterObject): TypeNode {
    const node = super.getTypeFromParameter(p);

    return node;
  }
}
