// suppose this a thing to be linked over the MEMFS
// so it overrides the MEMFS implementation
// OH I GET IT
// the resulting system evals this
// modules.js EVALS this code
// the mergeInto function is evaluated at compile time
// this is evaluated at compile time
// we can pass in JS code to be evaluated at program load time
// or in this case LibGit call time
// this will set the correct item?
// but if staticInit is called first, then you have a problem, since that will try to initialise the fs with no memfs available?
// ok this won't work cause the staticInit is called first before the $MEMFS__postset
// so we cannot acquire the Module.libgit.virtualfs here

mergeInto(LibraryManager.library, {
  $MEMFS__deps: ['$FS'],
  $MEMFS__postset: 'console.log("MEMFS POSTSET");',
  $MEMFS: null
});
