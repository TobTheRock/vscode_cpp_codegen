# codegen-cpp README

This is extension allows the generation of C++ stubs.
## Features
The extensions automatically loaded when using the C++ language. 
The following commands are provided while a C++ file is open in the editor:

* `codegen-cpp: Generate source file from header` : Parses an open header file and generates the source stub. The output directory can be provided via the UI.
* `codegen-cpp:  Generate interface implementation source/header files` : Parses an open header file and generates implementation stubs for all available interfaces. The names of the interface implementations can be provided via the UI.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `codegen-cpp.cppSourceFileHeader`: File header which is added at the top of each generated C++ source file
* `codegen-cpp.cppHeaderFileHeader"`: "File header which is added at the top of each generated C++ header file

## Known Issues

* Updating existing files is not supported
* Lots of other stuff, see TODOs
## Release Notes


### 0.0.1

Initial release for testing the initial two generator features: source stubs and implementing interfaces

-----------------------------------------------------------------------------------------------------------
