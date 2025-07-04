import type { OpenAPIV3 } from 'openapi-types';
import { TransformationMethod } from './TransformationMethod';
import ts from 'typescript';

export class TransformationMethods {
  readonly methodsByName: Map<string, TransformationMethod> = new Map<string, TransformationMethod>();

  getOrCreateMethod(
    typeName: string,
    type: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | boolean,
    doc: OpenAPIV3.Document<{}>
  ): TransformationMethod {
    let method = this.methodsByName.get(typeName);
    if (!method) {
      method = new TransformationMethod(typeName);
      this.methodsByName.set(typeName, method);
      method.initialize(this, type, doc);
    }
    return method;
  }

  generateMethodsCode(): ts.Statement[] {
    const code: ts.Statement[] = [];

    for (const [typeName, method] of this.methodsByName.entries()) {
      if (method.isEmpty()) {
        continue;
      }
      const identifier = ts.factory.createIdentifier(typeName[0].toLowerCase() + typeName.slice(1));
      const methodCode = method.transformation?.getTransformationCode(identifier);
      if (!methodCode || methodCode.length === 0) continue;

      code.push(
        ts.factory.createFunctionDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier(method.methodName),
          undefined,
          [
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              identifier,
              undefined,
              ts.factory.createTypeReferenceNode(typeName, undefined),
              undefined
            ),
          ],
          undefined,
          ts.factory.createBlock(methodCode, true)
        )
      );
    }
    return code;
  }
}
