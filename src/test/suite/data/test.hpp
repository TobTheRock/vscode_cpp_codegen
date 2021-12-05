/*
* Some header
*/

void standaloneFunction(int arg);
class TestClass {
    TestClass();
    ~TestClass();
    void memberFunction();
};

namespace firstNamespace {
    void standaloneFunction(int arg);
    class TestClass {
        void memberFunction();
    };
namespace nestedNamespace {
    void standaloneFunction(int arg);
    class TestClass {
        void memberFunction();
    };
}
}
