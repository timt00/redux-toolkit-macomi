import type { Transformation } from './Transformation';

export class PropertyTransformation {
  readonly propertyName: string;
  readonly transformation: Transformation;

  constructor(propertyName: string, transformation: Transformation) {
    this.propertyName = propertyName;
    this.transformation = transformation;
  }
}
