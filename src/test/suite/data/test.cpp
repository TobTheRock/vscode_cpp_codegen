/*
 THIS IS A TEST HEADER TOO
*/
#include "test.hpp"

void standaloneFunction(int arg) {
}

TestClass::TestClass() {
}

TestClass::~TestClass() {
}

void TestClass::memberFunction() {
}

namespace firstNamespace {

void standaloneFunction(int arg) {
}

void TestClass::memberFunction() {
}

namespace nestedNamespace {

void standaloneFunction(int arg) {
}

void TestClass::memberFunction() {
}

}
}