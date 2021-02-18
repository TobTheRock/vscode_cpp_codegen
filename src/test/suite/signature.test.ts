

import * as assert from 'assert';
import { Done, describe, it, test } from 'mocha';
import { callItAsync } from "./utils";
import {SourceParser} from '../../io/SourceParser';
import {TextFragment, SerializableMode, ISerializable, TextScope, compareSignaturables} from '../../io';

const argData = ["", "int test", "int test1, const Class* test2, void* test3", "int \ttest1,\t\n const\n Class* test2\n, void* test3\n\t"];
suite('Signature Tests', () => {

test('ComparingSignatures', (done) => {

    let signature = {namespaces:["Namespace1", "Namespace2"], signature:`fncName()`, textScope: new TextScope(0,0), content:"" };
    let signature2 = {namespaces:["Namespace1", "Namespace2"], signature:`anotherfncName()`, textScope: new TextScope(0,0), content:"" };
    
    assert.ok(compareSignaturables(signature, signature));
    assert.ok(!compareSignaturables(signature, signature2));

    done();
});	

test('ComparingSignatureAdditionalNamespaces', (done) => {
    let signature = {namespaces:["Namespace1", "Namespace2"], signature:`fncName()`, textScope: new TextScope(0,0), content:"" };
    let signature2 = {namespaces:[], signature:`fncName()`, textScope: new TextScope(0,0), content:"" };
    assert.ok(!compareSignaturables(signature, signature2));
    assert.ok(compareSignaturables(signature, signature2, ["Namespace1", "Namespace2"]));
    assert.ok(!compareSignaturables(signature, signature2, ["Namespace3"]));
    done();
});
});