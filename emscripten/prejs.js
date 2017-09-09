// this js file needs to be put as --pre-js to the final output to JS
// this allows us to add code that modifies the Module object properties
// that change the execution environment of libgit2 and the emscripten Module object
// since this is embedded into emscripten JS, we shall only use ES3 JS

var Module = {
  returnTheFs: function () {
    return FS;
  }
};

// inside the module object, we can define overrides for print, printErr, arguments
// (note that arguments are for when the code defines a main function that checks for argc and argv)
// preInit (function or array of functions) which must be called before global initializers run but after basic initialisation of JS runtime, (this can be used for File System operations)
// preRun called before calling run(), this is after preInit which means after setting up the environment, and this works for File System API
// I don't know the difference

// but if you define the ENVIRONMENT to SHELL, then you need to supply implementations of `print` and the other functions, as that means emscripten won't know how to implement these functions because it does not know what environment it is in
// I think the minimal one would be `print` and `printErr` because that's the only IO it really does or maybe even `arguments`
