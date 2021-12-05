import * as vscode from "vscode";
import * as io from "../../io";
import * as cpp from "../../cpp";
import { beforeEach, before } from "mocha";
import * as path from "path";
import { SourceFileMerger } from "../../SourceFileMerger";
import { StandaloneFunction } from "../../cpp/StandaloneFunction";
import { ISerializable, TextScope } from "../../io";

import chai = require("chai");
import { ClassImplementation } from "../../cpp/Class";
import { Namespace } from "../../cpp/Namespace";
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

suite("Source file merger", async () => {
  let testHeaderDocument: vscode.TextDocument;
  let testSourceDocument: vscode.TextDocument;
  before(async () => {
    testHeaderDocument = await openDocument("./data/test.hpp");
    testSourceDocument = await openDocument("./data/test.cpp");
  });

  let testHeaderFile: cpp.HeaderFile;
  let testSourceFile: cpp.SourceFile;
  let edit: vscode.WorkspaceEdit;
  let serializationOptions: io.SerializationOptions;

  beforeEach(() => {
    testHeaderFile = new cpp.HeaderFile(
      testHeaderDocument.fileName,
      testHeaderDocument.getText()
    );
    testSourceFile = new cpp.SourceFile(
      testSourceDocument.fileName,
      testSourceDocument.getText()
    );
    edit = new vscode.WorkspaceEdit();
    serializationOptions = { mode: io.SerializableMode.source };
  });

  function createSourceFileMerger() {
    return new SourceFileMerger(
      {},
      testHeaderFile,
      testSourceDocument,
      edit,
      serializationOptions
    );
  }

  function expectAndGetSingleTextEdit() {
    return expectAndGetEdits(1)[0];
  }

  function expectAndGetEdits(nofEdits: number) {
    const edits = edit.get(testSourceDocument.uri);
    expect(edits).to.be.length(nofEdits);
    return edits;
  }

  function expectSerializableAddedByEdit(
    edit: vscode.TextEdit,
    serializable: ISerializable,
    where: number
  ) {
    expect(isAddingTextEdit(edit)).to.be.true;
    expect(edit.newText).to.be.equalIgnoreSpaces(
      serializable.serialize(serializationOptions).toString()
    );
    expect(edit.range.start.isEqual(getSourceFilePosition(where))).to.be.true;
  }

  function getSourceFilePosition(index: number) {
    return testSourceDocument.positionAt(index);
  }

  function isAddingTextEdit(textEdit: vscode.TextEdit) {
    return (
      textEdit.newText.length && textEdit.range.start === textEdit.range.end
    );
  }

  function expectSerializableRemovedByEdit(
    edit: vscode.TextEdit,
    serializable: ISerializable & TextScope
  ) {
    expect(isRemovingTextEdit(edit)).to.be.true;
    expect(edit.range.isEqual(getRemovedRangeFromTextScope(serializable))).to.be
      .true;
  }

  function isRemovingTextEdit(textEdit: vscode.TextEdit) {
    return (
      !textEdit.newText.length && textEdit.range.start !== textEdit.range.end
    );
  }

  function getRemovedRangeFromTextScope(scope: TextScope) {
    const start = getSourceFilePosition(scope.scopeStart);
    const end = getSourceFilePosition(scope.scopeEnd + 1);
    return new vscode.Range(start, end);
  }

  function getRangeAtTextScopeEnd(scope: TextScope) {
    const end = getSourceFilePosition(scope.scopeEnd);
    return new vscode.Range(end, end);
  }

  test("Should not add/delete anything if there are no changeS", function () {
    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();
    expect(edit.get(testSourceDocument.uri)).to.be.empty;
  });

  test("Should add definitions for standalone functions to end of root namespace", function () {
    const newStandaloneFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    testHeaderFile.rootNamespace.functions.push(newStandaloneFunction);

    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableAddedByEdit(
      edit,
      newStandaloneFunction,
      testSourceFile.rootNamespace.scopeEnd + 1
    );
  });

  test("Should add definitions for member functions to end of root namespace", function () {
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

    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableAddedByEdit(
      edit,
      newClass,
      testSourceFile.rootNamespace.scopeEnd + 1
    );
  });

  test("Should new namespace to end of root namespace", function () {
    const newFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    const newNamespace = new Namespace("newNamespace", TextScope.createEmpty());
    newNamespace.functions.push(newFunction);
    testHeaderFile.rootNamespace.subnamespaces.push(newNamespace);

    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableAddedByEdit(
      edit,
      newNamespace,
      testSourceFile.rootNamespace.scopeEnd + 1
    );
  });

  test("Should add definitions within a namespace", function () {
    const newStandaloneFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    testHeaderFile.rootNamespace.subnamespaces[0].functions.push(
      newStandaloneFunction
    );

    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableAddedByEdit(
      edit,
      newStandaloneFunction,
      testSourceFile.rootNamespace.subnamespaces[0].scopeEnd
    );
  });

  test("Should add new namespace within existing namespace", function () {
    const newFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    const newNamespace = new Namespace("newNamespace", TextScope.createEmpty());
    newNamespace.functions.push(newFunction);
    testHeaderFile.rootNamespace.subnamespaces[0].subnamespaces.push(
      newNamespace
    );

    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableAddedByEdit(
      edit,
      newNamespace,
      testSourceFile.rootNamespace.subnamespaces[0].scopeEnd
    );
  });

  test("Should add definitions within a nested namespace", function () {
    const newStandaloneFunction = new StandaloneFunction(
      "newStandaloneFunction",
      "void",
      "",
      TextScope.createEmpty()
    );
    testHeaderFile.rootNamespace.subnamespaces[0].subnamespaces[0].functions.push(
      newStandaloneFunction
    );

    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableAddedByEdit(
      edit,
      newStandaloneFunction,
      testSourceFile.rootNamespace.subnamespaces[0].subnamespaces[0].scopeEnd
    );
  });

  test("Should remove standalone function definition", function () {
    const removedFunctionName = testHeaderFile.rootNamespace.functions[0].name;

    testHeaderFile.rootNamespace.functions.length = 0;
    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableRemovedByEdit(
      edit,
      testSourceFile.rootNamespace.functions.find(
        (fnct) => fnct.name === removedFunctionName
      )!
    );
  });

  test("Should remove class member function definitions", function () {
    const className = testHeaderFile.rootNamespace.classes[0].name;

    testHeaderFile.rootNamespace.classes.length = 0;
    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edits = expectAndGetEdits(3);
    const sourceFileClassMemberDefinitions =
      testSourceFile.rootNamespace.functions.filter((fnct) =>
        fnct.name.includes(className)
      );
    for (const edit of edits) {
      expect(isRemovingTextEdit(edit)).to.be.true;
      expect(
        sourceFileClassMemberDefinitions.some((serializable) =>
          edit.range.isEqual(getRemovedRangeFromTextScope(serializable))
        )
      ).to.be.true;
    }
  });

  test("Should remove standalone function definitions from namespace", function () {
    const removedFunctionName =
      testHeaderFile.rootNamespace.subnamespaces[0].functions[0].name;

    testHeaderFile.rootNamespace.subnamespaces[0].functions.length = 0;
    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableRemovedByEdit(
      edit,
      testSourceFile.rootNamespace.subnamespaces[0].functions.find(
        (fnct) => fnct.name === removedFunctionName
      )!
    );
  });

  test("Should remove standalone function definitions from nested namespace", function () {
    const removedFunctionName =
      testHeaderFile.rootNamespace.subnamespaces[0].subnamespaces[0]
        .functions[0].name;

    testHeaderFile.rootNamespace.subnamespaces[0].subnamespaces[0].functions.length = 0;
    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableRemovedByEdit(
      edit,
      testSourceFile.rootNamespace.subnamespaces[0].subnamespaces[0].functions.find(
        (fnct) => fnct.name === removedFunctionName
      )!
    );
  });

  test("Should remove empty namespace", function () {
    const namespacename = testHeaderFile.rootNamespace.subnamespaces[0].name;

    testHeaderFile.rootNamespace.subnamespaces[0].functions.length = 0;
    testHeaderFile.rootNamespace.subnamespaces[0].classes.length = 0;
    testHeaderFile.rootNamespace.subnamespaces[0].subnamespaces.length = 0;
    const sourceFileMerger = createSourceFileMerger();
    sourceFileMerger.merge();

    const edit = expectAndGetSingleTextEdit();
    expectSerializableRemovedByEdit(
      edit,
      testSourceFile.rootNamespace.subnamespaces[0]
    );
  });
});
