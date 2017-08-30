# VirtualGit

VirtualGit is a fork of https://github.com/SamyPesse/gitkit-js. It is a virtual git in a virtual fs. This means it runs completely in-memory. It is intended to work in browsers and in NodeJS.

This package will be maintained as long as the Polykey project is maintained. All tests are passing in this fork.

Documentation
--------------

Development
-------------

To run flow type checks:

```
flow init # this is already done
flow status # launches background process
flow stop # stops background process
```

To build this package for release:

```
npm run build
```

It will run tests, generate documentation and output multiple targets. One for browsers and one for nodejs. See `rollup.config.js` to see the target specification.

If your bundler is aware of the module field in `package.json`, you'll get the ES6 module directly.

Once you've updated the package run this:

```
npm version <update_type>
npm publish
```

---

We need to start with the Git object and commit.

Then also work on the Git workspace implementation. So we can git add changes, and then track changes to it in the commit system.

We also need a crypto system to generate the hashes.

The .git is the git database, it maintains a HEAD file pointing to the correct position, and an objects directory, and a refs directory. If we were to reimplement git, it should be possible to just point it to the in-memory fs, and it should be able to track the workspace and create a hidden directory like .git, as part of a particular folder.

The important part is the ability to use tar to read in an entire directory recursively and then scan into it to get all the components, and package it up. Should we be using tar to do this though? Does it maintain deterministic integrity?

Actually 4 years ago Xuan Li was able to use emscripten to compile the libgit2 into a JS version. I think this might still be possible, what we could do is use libgit2 as a git submodule, and then compile that into JS using emscripten. This might make it more interesting than trying to rewrite git. And if it works, I get access to all of git! Note that since this is not linking system but a emscripten recompilation, I think the license infects this and causes it to be GPL?

So there's a linking exception, this should mean that the emscripten output is in fact GPL (even though it's kind of like a compiler output of emscripten). I'm not sure though. Is the binary executable from a compiler also considered under GPL? Doesn't make sense does it. Subsequently the usage of JS on the compiled output, in this case "javascript" should then be considered a form of linking right?

And how do we make sure that libgit2 will be using the node fs api? In our case it is the fs api that we want to be using is our virtualfs?

Apparently if you keep just the `.git` folder, you can just later checkout the HEAD, and it will retrieve everything from the `.git` folder.

---

So we have 2 options, use libgit2 + emscripten + custom pluggable backend that uses VirtualFS (this is so that we have more control over the FS implementation). Or implement Git in JS.

I'm going to try the first method, looking into getting the libgit2 source as a submodule in this repository and having emscripten installed via nixpkgs. This may require both the ability to bind C calls to JS, and also JS calls to C, since we want to use the pluggable backend to libgit2, means implementing the pluggable backend header! So really it's kind of the same as just using the memfs backend that libgit2 already supplies.

Note that about the 2 ways of "archiving" a git repository, which we need to do to be able to apply encryption to the entire repository. The git archive method, the git bundle method or the tar method. The first method doesn't work, because it skips on the .git, and it's more for exporting from git. We want to keep git as is, so only the last 2 methods are supposed to be used. It appears that git bundle is the best way for now. Bundle includes .git, but will respect the .gitignore, I wonder if the bundle is part of the libgit2 source? It doesn't appear to have it, it's the core git implementation, rather than the frontend, oh well!

```
git bundle create SomeBundle.git HEAD
git clone SomeBundle.git ~/somebundle
```

This may be useful: https://github.com/bnoordhuis/node-heapdump Especially for counter.js to verify that memory is being reduced. Also we can just use the node inspector that's builting into nodejs. Another is just `node --prof ./something.js` and `node --prof-process ./the-generated-log-file`. This appears useful too.

NixOS has a special command called `buildEmscriptenPackage` and `emscriptenStdenv`, note that `emscriptenStdenv` should be what we use to build emscripten packages. This is actually simple and it's to build the ports. Really the point is that `emscriptenStdenv` is just normal `stdenv` with its `mkDerivation` overriden to `buildEmscriptenPackage`, this exposes the `mkDerivation` function, and overrides a couple of the build hooks to be relevant to emscripten. You can still override it later, again we're probably not going to use this, unless we intend to submit libgit2 to: https://github.com/NixOS/nixpkgs/blob/master/pkgs/top-level/emscripten-packages.nix Which we may I guess... We can see say ports of libxml2 to emscripten environment, which replaces a few targets, and brings in extra build inputs like nodejs. And it will change it so that autoreconfPhase is not used, and checkPhase gets changed to add in some extra commands. Note that emscripten installed via nix doesn't use the sdk style, I think if this is usable, then there's no need. Also python2 and nodejs is being used as well. So we can preserve the usage of the same versions of code there. (note that in nixpkgs python still refers to python2).

For libgit2, it uses cmake, so we need this to be brought into the buildInputs. The emscripten build in nixpkgs actually uses the fastcomp backend. Awesome! The current version I have is 1.37.1, whilc the most latest version is 1.37.19.
