// this js file needs to be put as --pre-js to the final output to JS
// this allows us to add code that modifies the Module object properties
// that change the execution environment of libgit2 and the emscripten Module object
// since this is embedded into emscripten JS, we shall only use ES3 JS

var Module = {
};

// inside the module object, we can define overrides for print, printErr, arguments
// (note that arguments are for when the code defines a main function that checks for argc and argv)
// preInit (function or array of functions) which must be called before global initializers run but after basic initialisation of JS runtime, (this can be used for File System operations)
// preRun called before calling run(), this is after preInit which means after setting up the environment, and this works for File System API
// I don't know the difference

// but if you define the ENVIRONMENT to SHELL, then you need to supply implementations of `print` and the other functions, as that means emscripten won't know how to implement these functions because it does not know what environment it is in
// I think the minimal one would be `print` and `printErr` because that's the only IO it really does or maybe even `arguments`

// this file runs before Module is setup
// everything else is then partially added to the Module object defined here
// this means we can do things before anything even happens
// add methods that change things for Emscripten, and also some predefined hook points are here as well
// one way to make sure this doesn't run until we want, is to use prejs and postjs as function header and footer
// afterall this is just concatenated, so we can do a function here that is exported, so that means the function can take a FS object for initialisation
// still I need to look for the hook points themselves

// we will need to extend the existing FS objects, but it does duck typing, so there's no need to extend the types, we just have to make sure the right methods and properties all exist
