import type { OpenAPIV3 } from 'openapi-types';
import type { TransformationMethods } from './TransformationMethods';
import type { TransformationMethod } from './TransformationMethod';
import { PropertyTransformation } from './PropertyTransformation';
import ts from 'typescript';
import { factory } from 'typescript';
import type { TransformationContext } from './TransformationContext';

type TransformationInfo =
  | {
      type: 'primitive';
    }
  | {
      type: 'date-time';
      nullable: boolean;
    }
  | {
      type: 'call-method';
      method: TransformationMethod;
    }
  | {
      type: 'array';
      itemTransformation: Transformation;
      nullable: boolean;
    }
  | {
      type: 'pass-through';
      transformation: Transformation;
    }
  | {
      type: 'object';
      propertyTransformations: PropertyTransformation[];
    };

const SCHEMA_PREFIX = '#/components/schemas/';

function getRefObject(
  doc: OpenAPIV3.Document<{}>,
  ref: string
): [OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, string] {
  if (ref.startsWith(SCHEMA_PREFIX)) {
    const componentName = ref.substring(SCHEMA_PREFIX.length);
    return [doc.components!.schemas![componentName], componentName];
  }
  throw new Error('Not implemented ref: ' + ref);
}

function addCheck(
  identifier: ts.Identifier | ts.PropertyAccessExpression,
  statement: ts.Statement,
  checkFor: 'null' | 'undefined'
): ts.IfStatement {
  const condition = ts.factory.createBinaryExpression(
    identifier,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ts.factory.createIdentifier(checkFor)
  );
  return factory.createIfStatement(condition, statement);
}

function addNullCheck(
  identifier: ts.Identifier | ts.PropertyAccessExpression,
  statement: ts.Statement
): ts.IfStatement {
  return addCheck(identifier, statement, 'null');
}

function addUndefinedCheck(
  identifier: ts.Identifier | ts.PropertyAccessExpression,
  statement: ts.Statement,
  nullable: boolean
): ts.IfStatement {
  if (nullable) {
    const condition = ts.factory.createLogicalAnd(
      ts.factory.createBinaryExpression(
        identifier,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.factory.createIdentifier('null')
      ),
      ts.factory.createBinaryExpression(
        identifier,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.factory.createIdentifier('undefined')
      )
    );
    return factory.createIfStatement(condition, statement);
  }
  return addCheck(identifier, statement, 'undefined');
}

export class Transformation {
  readonly info: TransformationInfo;

  constructor(
    methods: TransformationMethods,
    type: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | boolean,
    doc: OpenAPIV3.Document<{}>
  ) {
    if (type === true || type === false) {
      this.info = { type: 'primitive' };
      return;
    }

    const refObject = type as OpenAPIV3.ReferenceObject;
    if (refObject.$ref) {
      const [obj, objName] = getRefObject(doc, refObject.$ref);
      const method = methods.getOrCreateMethod(objName, obj, doc);
      this.info = {
        type: 'call-method',
        method,
      };
      return;
    }

    const schemaObject = type as OpenAPIV3.SchemaObject;
    if (schemaObject.type === 'array') {
      this.info = {
        type: 'array',
        itemTransformation: new Transformation(methods, schemaObject.items, doc),
        nullable: schemaObject.nullable === true,
      };
      return;
    }

    if (schemaObject.type === 'boolean' || schemaObject.type === 'integer' || schemaObject.type === 'number') {
      this.info = { type: 'primitive' };
      return;
    }

    if (schemaObject.type === 'object') {
      if (schemaObject.additionalProperties) {
        if (schemaObject.properties) throw new Error("Wasn't expecting both additionalProperties AND properties");

        this.info = {
          type: 'pass-through',
          transformation: new Transformation(methods, schemaObject.additionalProperties, doc),
        };
        return;
      }

      if (!schemaObject.properties)
        throw new Error('No properties and no additional properties in obj ' + JSON.stringify(schemaObject));

      this.info = {
        type: 'object',
        propertyTransformations: [],
      };

      for (const [propertyName, propertyType] of Object.entries(schemaObject.properties))
        this.info.propertyTransformations.push(
          new PropertyTransformation(propertyName, new Transformation(methods, propertyType, doc))
        );
      return;
    }

    // Has to be a string type at this point
    if (schemaObject.format !== 'date-time') {
      this.info = { type: 'primitive' };
      return;
    }
    this.info = { type: 'date-time', nullable: schemaObject.nullable === true };
  }

  getTransformationCode(
    identifier: ts.Identifier | ts.PropertyAccessExpression,
    ctx: TransformationContext
  ): ts.Statement[] | null {
    switch (this.info.type) {
      case 'primitive':
        return null;
      case 'call-method':
        if (this.info.method.isEmpty()) return null;
        const callExpression = factory.createCallExpression(
          factory.createIdentifier(this.info.method.methodName),
          undefined,
          [identifier]
        );
        const callCondition = ts.factory.createBinaryExpression(
          identifier,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ts.factory.createIdentifier('undefined')
        );
        return [factory.createIfStatement(callCondition, factory.createExpressionStatement(callExpression))];
      case 'array':
        const itemExpression = factory.createIdentifier('child');

        var arrayCode = this.info.itemTransformation.getTransformationCode(itemExpression, ctx);
        if (arrayCode === null || arrayCode.length === 0) return null;

        const loopVar = factory.createVariableDeclaration(itemExpression);
        const forOfInitializer = factory.createVariableDeclarationList([loopVar], ts.NodeFlags.Const);
        const forLoop = factory.createForOfStatement(
          undefined,
          forOfInitializer,
          identifier,
          factory.createBlock(arrayCode)
        );
        const forExpr = ctx.requireAllProperties
          ? this.info.nullable
            ? addNullCheck(identifier, forLoop)
            : forLoop
          : addUndefinedCheck(identifier, forLoop, this.info.nullable);

        return [forExpr];
      case 'pass-through':
        return this.info.transformation.getTransformationCode(identifier, ctx);
      case 'object':
        let propertyCode: ts.Statement[] = [];
        for (const property of this.info.propertyTransformations) {
          if (property.transformation.isEmpty()) continue;
          const code = property.transformation.getTransformationCode(
            factory.createPropertyAccessExpression(identifier, property.propertyName),
            ctx
          );
          if (code === null || code.length === 0) continue;
          propertyCode = [...propertyCode, ...code];
        }
        return propertyCode;
      case 'date-time':
        const newDateExpr = ts.factory.createNewExpression(ts.factory.createIdentifier('Date'), undefined, [
          identifier,
        ]);

        const assignmentExpression = factory.createExpressionStatement(
          factory.createAssignment(identifier, newDateExpr)
        );

        const expr = ctx.requireAllProperties
          ? this.info.nullable
            ? addNullCheck(identifier, assignmentExpression)
            : assignmentExpression
          : addUndefinedCheck(identifier, assignmentExpression, this.info.nullable);

        return [expr];
    }
  }

  isEmpty(): boolean {
    switch (this.info.type) {
      case 'primitive':
        return true;
      case 'date-time':
        return false;
      case 'call-method':
        return this.info.method.isEmpty();
      case 'array':
        return this.info.itemTransformation.isEmpty();
      case 'pass-through':
        return this.info.transformation.isEmpty();
      case 'object':
        let isEmpty = true;
        for (const prop of this.info.propertyTransformations) {
          if (prop.transformation.isEmpty()) continue;
          isEmpty = false;
          break;
        }
        return isEmpty;
    }
  }
}
