import { flatten } from "lodash";
import * as cpp from "./cpp";
import * as io from "./io";
import { Difference } from "./TextDocumentManipulation";

export class NamespaceDefinitionDifference {
  constructor(private readonly _serializeOptions: io.SerializationOptions) {}

  getDifference(
    existingNamespace: cpp.INamespace,
    generatedNamespace: cpp.INamespace
  ): Difference<cpp.IDefinition> {
    const existingDefinitions = cpp.extractDefinitionsFromNamespace(
      existingNamespace,
      this._serializeOptions.mode
    );
    const generatedDefinitions = cpp.extractDefinitionsFromNamespace(
      generatedNamespace,
      this._serializeOptions.mode
    );

    return new Difference(
      existingDefinitions,
      generatedDefinitions,
      this._serializeOptions
    );
  }
}
