import VirtualGit from './lib/VirtualGit.js';
import vfs from 'virtualfs';

const vgit = new VirtualGit(vfs);

// here we deal with these capabilities
// but we can also use just a function
// no bothering with version either

const repo = vgit.init('/testrepo', {
  mode: 0o777
});
