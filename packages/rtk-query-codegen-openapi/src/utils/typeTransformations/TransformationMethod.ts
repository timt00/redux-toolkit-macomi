import type { OpenAPIV3 } from 'openapi-types';
import { Transformation } from './Transformation';
import type { TransformationMethods } from './TransformationMethods';

enum State {
  NotStarted,
  InProgress,
  Created,
  CheckingForEmpty,
  Finished,
}

export class TransformationMethod {
  readonly typeName: string;
  readonly methodName: string;
  state: State = State.NotStarted;
  transformation: Transformation | null = null;
  isTransformationEmpty: boolean | null = null;

  constructor(typeName: string) {
    this.typeName = typeName;
    this.methodName = `transform${typeName[0].toUpperCase() + typeName.slice(1)}Response`;
  }

  initialize(
    methods: TransformationMethods,
    type: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | boolean,
    doc: OpenAPIV3.Document<{}>
  ) {
    if (this.state !== State.NotStarted) return;
    this.state = State.InProgress;
    this.transformation = new Transformation(methods, type, doc);
    this.state = State.Created;
  }

  isEmpty(): boolean {
    switch (this.state) {
      case State.NotStarted:
      case State.InProgress:
        throw new Error("You're calling isEmpty too soon");
      case State.Created:
        this.state = State.CheckingForEmpty;
        this.isTransformationEmpty = this.transformation!.isEmpty();
        this.state = State.Finished;
        return this.isTransformationEmpty;
      case State.CheckingForEmpty:
        // Reasoning here is that if the only thing a transformation is counting on to not be empty
        // is this circular-call, then it can be considered empty
        return false;
      case State.Finished:
        return this.isTransformationEmpty!;
    }
  }
}
