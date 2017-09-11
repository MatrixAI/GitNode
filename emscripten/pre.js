// vfs: VirtualFS instance
// there may be other parameters to add in the future
// like socket implementation (to deal with different underlying engine)
function LibGit (vfs) { // LibGit function header

  // this prevents explicit cjs exporting at shell.js
  let module = undefined;

  // we'll use a libgit namespace to avoid conflicts
  var Module = {
    thisProgram: 'virtualgit',
    libgit: {
      virtualfs: vfs
    }
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
