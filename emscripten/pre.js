// vfs: VirtualFS instance
// there may be other parameters to add in the future
// like socket implementation (to deal with different underlying engine)

// this needs a Buffer implementation as well


function LibGit (VirtualFS, Buffer) { // LibGit function header

  // this prevents explicit cjs exporting at shell.js
  var module = undefined;

  // arguments is meant for command line arguments
  // args is for module arguments provided as a function above
  var Module = {
    thisProgram: 'virtualgit'
  };

  // things that change according to environment:
  // so if we set environment to shell, which is the most generic environment
  // these methods will need to be set
  // print, printErr
  // read
  // readBinary
  // arguments
  // load
  // readAsync
  // thisProgram
  // inspect
