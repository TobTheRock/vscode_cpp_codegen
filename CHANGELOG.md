# Change Log

All notable changes to the "codegen-cpp" extension will be documented in this file.
## [0.1.3]
### Added
- configuration for the namespace serialization mode
-  support for structs, (child class of `ClassBase`)
### Changed
- refactored configuration handling
  - added singleton
  - update on change
- common tests for structs and classes
- handling new line artificats when merging source files (due to empty serialzed namespaces)
- `HeaderParser`: serialization of friend functions, added a matcher class for this
- updated node dependencies
- `WorkspaceDirectoryFinder`: 
  - removed singleton
  - improved performance by only watching directory changes
## [0.1.2]
### Added
- settings to ignore certain folders (json array or from `.gitignore`)
- setting to choose how output directories are selected (None/QuickPick/UI dialogue) 
### Changed

- `HeaderParser`: extended matchers, so that cast and (de)allocation operators are parsed correctly
- Improved `WorkspaceDirectoryFinder`
    - using `chokidar` for FS events (folder added/deleted)
    - fixed added/removed workspace root folders handling
    - parsing  `.gitignore` files
- `FileHandler`: 
    - improved directory QuickPick, selections are now first set as a input value and then have to be confirmed (saves typing)
    - optionally use QuickPick or UI dialogue to choose an output directory. Alternatively use the path of the root file (no input)

## [0.1.1]
### Changed
- fix: Typos in Readme/ package.json
- fix: serialization of nested classes, the proper name scope can now be passed to an ISerializable via a new interface
- fix: Merging source files, also removing new lines feeds after a removed definition (adapted the regex)
## [0.1.0]
- Initial release
### Added
- Functionality: generating interface implementation stubs
- Functionality: generating source file stubs
- Functionality: merging source files
- Various configuration options
