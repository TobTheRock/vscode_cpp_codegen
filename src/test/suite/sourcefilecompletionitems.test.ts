import * as vscode from "vscode";
import * as io from "../../io";
import * as cpp from "../../cpp";
import { beforeEach, before } from "mocha";
import * as path from "path";
import { StandaloneFunction } from "../../cpp/StandaloneFunction";
import { ISerializable, TextScope } from "../../io";

import chai = require("chai");
import { ClassImplementation } from "../../cpp/Class";
import { Namespace } from "../../cpp/Namespace";
import { SourceFileCompletionItems } from "../../SourceFileCompletionItems";
chai.use(require("chai-string"));
const assert = chai.assert;
const expect = chai.expect;

async function openDocument(relativePath: string) {
  return await vscode.workspace.openTextDocument(
    vscode.Uri.file(
      path.join(__dirname, "../../../src/test/suite", relativePath)
    )
  );
}

suite("SourceFileCompletionItems", async () => {
  let testHeaderDocument: vscode.TextDocument;
  let testSourceDocument: vscode.TextDocument;
  const serializeOptions: io.SerializationOptions = {
    mode: io.SerializableMode.source,
  };
  before(async () => {
    testHeaderDocument = await openDocument("./data/test.hpp");
    testSourceDocument = await openDocument("./data/test.cpp");
  });

  let testHeaderFile: cpp.HeaderFile;
  let testSourceFile: cpp.SourceFile;

  beforeEach(() => {
    testHeaderFile = new cpp.HeaderFile(
      testHeaderDocument.fileName,
      testHeaderDocument.getText()
    );
    testSourceFile = new cpp.SourceFile(
      testSourceDocument.fileName,
      testSourceDocument.getText()
    );
  });

  function createSourceFileCompletionItems() {
    return new SourceFileCompletionItems(testSourceFile, testHeaderFile);
  }

  function createTextScopeWithinRootScope(): TextScope {
    const rootScope = testHeaderFile.rootNamespace;

    const start = (rootScope.scopeEnd - rootScope.scopeStart) / 4;
    const end = rootScope.scopeEnd - start;

    const textScope = new TextScope(start, end);
    return textScope;
  }

  function createTextScopeOutofRootscope(): TextScope {
    const rootScope = testHeaderFile.rootNamespace;

    const start = rootScope.scopeEnd + 1;
    const end = start + 1;

    const textScope = new TextScope(start, end);
    return textScope;
  }

  //TODO test kind
  function expectSingleCompletionItem(
    completionItems: vscode.CompletionItem[],
    expectedSerializable: io.ISerializable,
    expectedKind: vscode.CompletionItemKind
  ) {
    expect(completionItems).to.have.length(1);
    const actualSerializedText = completionItems[0].insertText;
    const actualLabel = completionItems[0].label;
    const expectedSerializedText =
      expectedSerializable.serialize(serializeOptions);
    const expectedLabel = expectedSerializable.serialize({
      mode: io.SerializableMode.completionItemLabel,
    });
    expect(actualSerializedText).to.equal(expectedSerializedText.toString());
    expect(actualLabel).to.equal(expectedLabel.toString());
    expect(completionItems[0].kind).to.equal(expectedKind);
  }

  test("Should return no completionItems  if there are no changes", function () {
    const fileDefinitionAddtions = createSourceFileCompletionItems();
    const scope = testSourceFile.rootNamespace as TextScope;
    const completionItems =
      fileDefinitionAddtions.getAddedCompletionItems(scope);
    expect(completionItems).to.have.length(0);
  });

  test("Should return added serializable for new standalone function in root namespace if selected", function () {
    const newStandaloneFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    testHeaderFile.rootNamespace.functions.push(newStandaloneFunction);

    const addedCompletionItems = createSourceFileCompletionItems();

    let completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace
    );
    expectSingleCompletionItem(
      completionItems,
      newStandaloneFunction,
      vscode.CompletionItemKind.Method
    );

    completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace.subnamespaces[0]
    );
    expect(completionItems).to.have.length(0);
  });

  test("Should return completionItems for member functions if selected", function () {
    const newMemberFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    const newClass = new ClassImplementation(
      TextScope.createEmpty(),
      "TestClass",
      []
    );
    newClass.publicScope.memberFunctions.push(newMemberFunction);
    testHeaderFile.rootNamespace.classes.push(newClass);

    const addedCompletionItems = createSourceFileCompletionItems();
    const completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace
    );

    expectSingleCompletionItem(
      completionItems,
      newMemberFunction,
      vscode.CompletionItemKind.Method
    );

    expect(
      addedCompletionItems.getAddedCompletionItems(
        testSourceFile.rootNamespace.subnamespaces[0] as io.TextScope
      )
    ).to.have.length(0);
  });

  test("Should return new namespace as completion item  if parent namespace is selected", function () {
    const newFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    const newNamespace = new Namespace(
      "newNamespace",
      createTextScopeWithinRootScope()
    );
    newNamespace.functions.push(newFunction);
    testHeaderFile.rootNamespace.subnamespaces.push(newNamespace);

    const addedCompletionItems = createSourceFileCompletionItems();
    const completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace
    );

    expectSingleCompletionItem(
      completionItems,
      newNamespace,
      vscode.CompletionItemKind.Module
    );

    expect(
      addedCompletionItems.getAddedCompletionItems(
        createTextScopeOutofRootscope()
      )
    ).to.have.length(0);
  });

  test("Should return added completion items for new standalone function in namespace if selected", function () {
    const newStandaloneFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    testHeaderFile.rootNamespace.subnamespaces[0].functions.push(
      newStandaloneFunction
    );

    const addedCompletionItems = createSourceFileCompletionItems();

    const completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace.subnamespaces[0] as io.TextScope
    );
    expectSingleCompletionItem(
      completionItems,
      newStandaloneFunction,
      vscode.CompletionItemKind.Method
    );

    expect(
      addedCompletionItems.getAddedCompletionItems(
        testSourceFile.rootNamespace as io.TextScope
      )
    ).to.have.length(0);
    expect(
      addedCompletionItems.getAddedCompletionItems(
        testSourceFile.rootNamespace.subnamespaces[0]
          .subnamespaces[0] as io.TextScope
      )
    ).to.have.length(0);
  });

  test("Should return added completion items for new standalone functions in nested namespace if selected", function () {
    const newStandaloneFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    testHeaderFile.rootNamespace.subnamespaces[0].subnamespaces[0].functions.push(
      newStandaloneFunction
    );

    const addedCompletionItems = createSourceFileCompletionItems();

    let completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace
    );
    expect(completionItems).to.have.length(0);

    completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace.subnamespaces[0]
    );
    expect(completionItems).to.have.length(0);

    completionItems = addedCompletionItems.getAddedCompletionItems(
      testSourceFile.rootNamespace.subnamespaces[0].subnamespaces[0]
    );
    expectSingleCompletionItem(
      completionItems,
      newStandaloneFunction,
      vscode.CompletionItemKind.Method
    );
  });

  test("Should return no completion items  if namespace/class/function was deleted", function () {
    testHeaderFile.rootNamespace.subnamespaces.length = 0;
    testHeaderFile.rootNamespace.functions.length = 0;
    testHeaderFile.rootNamespace.functions.length = 0;
    const fileDefinitionAddtions = createSourceFileCompletionItems();
    const scope = testSourceFile.rootNamespace as TextScope;
    const completionItems =
      fileDefinitionAddtions.getAddedCompletionItems(scope);
    expect(completionItems).to.have.length(0);
  });
});
