import type { OpenAPIV3 } from 'openapi-types';
import type { TransformationMethods } from './TransformationMethods';
import type { TransformationMethod } from './TransformationMethod';
import { PropertyTransformation } from './PropertyTransformation';
import ts from 'typescript';
import { factory } from 'typescript';

type TransformationInfo =
  | {
      type: 'primitive' | 'date-time';
    }
  | {
      type: 'call-method';
      method: TransformationMethod;
    }
  | {
      type: 'array';
      itemTransformation: Transformation;
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

function createCommentStatement(comment: string): ts.Statement {
  return ts.addSyntheticLeadingComment(
    factory.createEmptyStatement(),
    ts.SyntaxKind.SingleLineCommentTrivia,
    comment,
    true
  );
}

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
    this.info = schemaObject.format === 'date-time' ? { type: 'date-time' } : { type: 'primitive' };
  }

  getTransformationCode(identifier: ts.Identifier | ts.PropertyAccessExpression): ts.Statement[] | null {
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

        var arrayCode = this.info.itemTransformation.getTransformationCode(itemExpression);
        if (arrayCode === null || arrayCode.length === 0) return null;

        const loopVar = factory.createVariableDeclaration(itemExpression);
        const forOfInitializer = factory.createVariableDeclarationList([loopVar], ts.NodeFlags.Const);
        const forLoop = factory.createForOfStatement(
          undefined,
          forOfInitializer,
          identifier,
          factory.createBlock(arrayCode)
        );

        const nonEmptyArrayCondition = ts.factory.createBinaryExpression(
          identifier,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ts.factory.createIdentifier('undefined')
        );

        return [factory.createIfStatement(nonEmptyArrayCondition, forLoop)];
      case 'pass-through':
        return this.info.transformation.getTransformationCode(identifier);
      case 'object':
        let propertyCode: ts.Statement[] = [];
        for (const property of this.info.propertyTransformations) {
          if (property.transformation.isEmpty()) continue;
          const code = property.transformation.getTransformationCode(
            factory.createPropertyAccessExpression(identifier, property.propertyName)
          );
          if (code === null || code.length === 0) continue;
          propertyCode = [...propertyCode, ...code];
        }
        return propertyCode;
      case 'date-time':
        const newDateExpr = ts.factory.createNewExpression(ts.factory.createIdentifier('Date'), undefined, [
          identifier,
        ]);
        // identifier might be undefined
        const condition = ts.factory.createBinaryExpression(
          identifier,
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.factory.createIdentifier('undefined')
        );
        const conditionalExpr = ts.factory.createConditionalExpression(
          condition,
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          ts.factory.createIdentifier('undefined'),
          ts.factory.createToken(ts.SyntaxKind.ColonToken),
          newDateExpr
        );

        return [factory.createExpressionStatement(factory.createAssignment(identifier, conditionalExpr))];
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
