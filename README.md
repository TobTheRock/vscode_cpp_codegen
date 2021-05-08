# codegen-cpp README

I grew tired of "writing" C++ definition stubs by copying around declarations from (interface) header files. Thus I wrote this extension, which helps generating said stubs from a header file. Additionally it allows creating the necessary files for an implementation of a given interface.  Multiline declarations and nested classes/namespaces are supported.
Still not perfect, but should work for the most common use cases.
## Features
The extension is automatically loaded when using the C++ language. 
The following commands are provided while a C++ header file (extension: `hpp`, `h`, `hxx`, `hh`)  is open in the editor:

* `codegen-cpp:  Generate interface implementation source/header files` : Parses the currently opened header file and generates implementation stubs for all available interfaces. The names of the interface implementations can be provided via the UI.
![](./docu/showcase_generate_interface_impl_stubs.gif)

* `codegen-cpp: Generate source file from header` : Parses the currently opened header file and generates the source stubs. The output directory can be provided via the UI. In case a source file exists, changes can be evaluated with the refactoring view;

![](./docu/showcase_merge_source_files.gif)

## Extension Settings

The following settings are available:

* `codegen-cpp.FileHeader.ForC++Source`: File header which is added at the top of each generated C++ source file
* `codegen-cpp.FileHeader.ForC++Header"`: File header which is added at the top of each generated C++ header file
* `codegen-cpp.OutputFileExtension.ForC++Header`: File extension used when generating C++ header files
* `codegen-cpp.OutputFileExtension.ForC++Source`: File extension used when generating C++ source files
* `codegen-cpp.deduceOutputFileNames`: Whether the output file name(s) should be deduced when generating:
    * *Source from Header*: by keeping the base name
    * *Interface implementations*: by using the name of the (first) implementation
    Else the file base name has to be entered via the UI.
* `codegen-cpp.OutputDirectorySelector.Mode`: Sets how the output directory of generated files can be selected, either:
    * `Disabled`: Disables the directory selector and created files are put in the directory of the root file.
    * `QuickPick`: Uses a quick pick selector with fuzzy find
    * `UI`: Uses a UI window
 * `codegen-cpp.OutputDirectorySelector.IgnoredDirectories`: Relative directory paths which are ignored for selection (anymatch-compatible definition)
 * `codegen-cpp.OutputDirectorySelector.UseGitIgnore`: Extracts ignored directories from the `.gitignore` file if available. Needs a window reload to be applied, as well when `.gitignore` is changed
 * `codegen-cpp.SourceFileNamespace.Serialization`: Sets how namespaces are serialized in generated source files
   * *Named*: Serialized with an explicit named definition, e.g. `namespace myNamespace{...}`
   * *Prepended*: Serialized prepended in front of function definitions, e.g. `void myNamespace::MyClass::funct()`
## Issues
Can be reported [here](https://github.com/HerrFroehlich/vscode_cpp_codegen/issues). Contributions are also welcome in any form.
### Known
* Updating existing header files is not supported
* `using` statements are not evaluated
* preprocessor macros after `class` specifier are not working
* enum classes are deserialized as classes 

## Possible features in future
* Generating code only for selected text ranges
* Prettifying the generated output 
* more configuration possibilities (e.g. for namespaces)
* Generating abstract factories
* ...
## Release Notes
### 0.1.3
- added: configuration for the namespace serialization mode
- added: support for structs
- fixed: new line artificats when merging source files
- fixed: serialization of friend functions
- fixed: window reload no longer required for certain configurations
### 0.1.2
- fixed: Parsing of cast and (de)allocation operators
- fixed: Updating folder quick pick choices on folder creation/deletion
- added: settings to ignore certain folders (json array or from `.gitignore`)
- added: setting to choose how output directories are selected (None/QuickPick/UI dialogue)
- improved directory QuickPick handling

### 0.1.1
- fixed:  Serialization of nested classes
- fixed:  Too many remaining new line feeds when merging source files

### 0.1.0

Initial release for testing the two generator features: source stubs and generating interface implementing stubs

-----------------------------------------------------------------------------------------------------------
