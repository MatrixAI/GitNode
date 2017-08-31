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

```
git submodule add https://github.com/libgit2/libgit2.git libgit2
git -C libgit2 reset --hard v0.26.0
```

So we're using v0.26.0 tag for libgit2. If later we want to bring in the project using the specified commit, we should be using:

```
git submodule update --init --recursive
```

Updating to the newest is a simple matter of doing `git submodule update --remote --merge libgit2`.

To start we also need cmake, it is possible to use cmake to build libgit2 first to see if we have the proper environment. We are using libgit2build first.

```
cd libgit2build
cmake ../libgit2
cmake --build .
cd -
```

We now have `libgit2build/libgi2.so`. As always it's a shared object, this all makes sense. We're not actually going to use this, but the build process shows us what we need to tweak to make a libgit2 targetting emscripten.

Furthermore during the cmake configuration process, it detects whether PkgConfig and OpenSSL and `HTTP_Parser` and ZLIB and LIBSSH2 is available. I'm not sure how this will impact the build using emscripten. If the http parser is not available it uses it's own bundled version, along with zlib. It appears OpenSSL and LIBSSH2 shoudl definitely be provided to provide all the capabilities. I wonder if this will be needed for polykey however, especially as I intened to provide sets key histories that needs to be pulled over.

This provides more information about this: https://libgit2.github.com/docs/guides/build-and-link/

We shouldn't need to build the test suite of course, so `BUILD_CLAR` should be set to OFF. Not sure if other settings are relevant to emscripten.

In terms of using it's code in the shared object, we have to use the `git2.h` header, and dynamically or statically link to the shared object. Note that we have the `libgit2_clar` binary, for testing, the `libgit2.so` which is a symlink to `libgit2.so.0.26.0`, which is the actual shared object. So where is the git2.h header? This should be part of the libgit2 source. If you build statically, the output should actually be `libgit2.a` instead of `.so`. Note that there's also a `.pc` file which represents the config for `pkg-config`, but is this used on NixOS? Oh it does via the `pkg-config` package that provides a pkgconfig hook. It adds the `lib/pkgconfig` and `share/pkgconfig` subdirectories to each build input to the `PKG_CONFIG_PATH`, so if the package exposes that capability, it should be available subsequently. So we just need this hook then.

If I bring in zlib and openssl and libssh2, will the resulting shared object do dynamic linking to these libraries, or will they also be statically linked in the end? With pkgconfig it now looks for libcurl as well! HMM? The nix build of this libgit2 specifies libiconv as a propagatedBuildInput, but the configure script doesn't ask for this library, I wonder what that means? Furthermore it specifies cmake, python and pkgconfig as nativeBuildInputs instead of buildInputs, what does this mean? There's a special flag added to the LDFLAGS which says to link with `-liconv` so I guess that may be important as well.

So after checking with ldd, it does show that the resulting binary now will do dynamic linking with curl, openssl, httpparser.. you know the rest. I wonder how does impacts emscripten.. Native build inputs is for the purpose of cross compilation. That is native build inputs specifies build inputs that need to be on the build architecture, while everything on the build inputs is cross compiled to the target architecture. This is because things like cmake, pkgconfig.. etc is not linked into the final binary, hence when "building" them to build libgit2, they only need to target the build system, since they will never be executed on the target system. However things like libcurl does get dynamically linked to the resulting binary, so libcurl needs to be built for the target system, since it never gets executed on the build system. That is... the whole idea is this is a "runtime" dependency vs a "buildtime" dependency. But the end result is that the sources for buildinputs do not get propagated to subsequent environments. For us this does not matter since we are not cross compiling per say, or at least we're not using the nixos system for cross compilation, instead the we're using emscripten to handle the cross compilation. So no need to separate out the dependencies, but in the future, if we decide to release an emscripten package on nixpkgs, it can be libgit2, in which case we would follow the same system as specified on the existing emscripten-packages.nix and we would override the existing build with emscripten instead. But I'm not sure how it handles dynamically linked dependencies. Does it also compile these into javascript too?

In ~/.emscripten_cache, here's where all the system libraries are compiled to, and stores as llvm bit code, I assume that this means dependencies of something like libgit2 would also need to be stored here. So they would have to be independently compiled as well with emscripten? That sucks.. As in these libraries are already available as emscripten ports, unless someone has already ported it to emscripten, then it can be packaged with emscripten-packages.

As stated in this https://github.com/kripken/emscripten/wiki/Linking we can see that emscripten works best when you only rely on system libraries and nothing else, then it all works, since system libraries are already natively handled by emscripten.

In terms of making C access JS calls, this consider reading this: https://github.com/evanw/emscripten-library-generator/issues/1

I think this means to fully support all of libgit2 source, you'd need to also use emscripten on `http_parser`, `openssl`, `libssh2` and `zlib`. Woah.. that's going to be big. It depends on what we want to support. What functionalities are relevant here. It appears possible: http://41j.com/blog/2014/12/compiling-openssl-libssh2-emscripten-notes/ It looks like while openssl and zlib and httpparser and libssh2 may be possible, curl may be the most difficult, since it interacts with platform specific socket code. I feel like it may not be possible or relevant here. I think without curl, you won't get network access, without ssh you don't have the ability to clone and stuff from ssh connections. Then what about... httparser? Why is that needed? Oh curl is used for proxy support, that's probably it then. We don't care about this, we should not need to use it.

I think at minimum we need openssl and libssh2 and zlib. The rest can be provided. In fact zlib and http parser seems to have it's own statically provided code. They are in the deps directory. zlib and httpparser. What's left is to port libssh2 and zlib, but I'm not sure if that actually does anything. I don't think libssh2 is supposed to work in emscripten, but it appears that it can. holy shit emscripten does have network support which does socket code, so perhaps libssh2 can work using websockets, wow that's crazy!

Ok so how does emscripten deal with dynamically linked third party modules. The way it works is this:

You have a main module that has the main function. This will be compiled to JS. This C main function will then lead to calling symbols that do not exist in the main module. This is where linking is required. So let's say you have a third party library called foo. And you want call `foo_call()` inside your main module, what you'd do then is compile the main targetting JS, then compile foo targetting JS as well while specifying that this is a "side module", so that it does not get any of the main initialisation bootstrapping code inlined. Finally in your main module you'd have to specify the libraries that are supposed to be linked together, specifically `Module.dynamicLibraries = ['foo.js']`. This means at startup, it actually links the foo.js, actually I have no idea whether this happens at compile/link time, or at JS running time like when running node.js, because if it happens at running JS time, then the actual linking occurs via JS runtime. I suppose that's possible, but how does that work with regards to browser targets, supposedly both JS outputs would need to be loaded into the browser context. Or somehow the loader is able to perform a script load. Whereas for nodejs, it should be a `require` call. Not sure how emscripten deals with different JS environments.

There's an issue if side modules requires system libraries that the main doesn't need. To get around this, you can build the main module with `EMCC_FORCE_STDLIBS=1`, which forces inclusion of all standard libs. This means all std libs will always be available. However if you know exactly what the side modules need, then you can specify this like `EMCC_FORCE_STDLIBS=libcxx,libcxxabi`. I can see this being the case with things like libssh2 and zlib and openssl.

So if I use the pluggable storage backends, does this mean I write it in C calling into external functions provided by JS, and then build the main module which calls libgit2 and links with side modules libssh2 and zlib and openssl? Not sure...

> Native linkers generally only run code when all symbols are resolved. Emscripten's dynamic linker hooks up symbols to unresolved references to those symbols dynamically. As a result, we don't check if any symbols remain unresolved, and code can start to run even if there are. It will run successfully if they are not called in practice. If they are, you will get a runtime error. What went wrong should be clear from the stack trace (in an unminified build); building with -s ASSERTIONS=1 can help some more.

Ah yes see dynamic linking is really running at runtime not at program startup! It's not even checked. Unlike native binaries which has static linking (linked at compile time), dynamic linking (linked at program startup), and "really" dynamic linking (dlopen) (linked at any time during running time).

However fastcomp appears not to support the dlopen style. I wonder if it supports the normal side modules then? Hmm this may require us to go to an emscripten that doesn't use fastcomp. OH so apparently the current emscripten still statically links dynamic libraries, so.. how does that work with `.so` files that are not JS code? I think it doesn't work unless you always compile them all using emscripten.

Emscripten thinks tha `.so`, `.bc` and `.o` files contain LLVM bitcode. This is different from native GCC thinking of these files, which are to be linked together to produce an executable, these object files are for emscripten to link together.

Emscripten has some features that force passing of configure and cmake checks since if you're not providing them to produce native binaries then some libraries are not going to be available.

http://blog.deveo.com/your-git-repository-in-a-database-pluggable-backends-in-libgit2/

If we create a file with functions, along with the macro `EMSCRIPTEN_KEEPALIVE`, we can call these functions in JS later on. The resulting output is a commonjs script that can be loaded in Node.js. So it certainly has CJS support, but what about babel? Well that's because babel translates it to a cjs module anyway.. so I don't think it is ES6 module. HOWEVER it is possible to use prejs and postjs to then write an export call directly, which should be able to wrap the compiled output in a CJS module. All we are doing is saying explicitly to export certain constructs, but I'm not sure... if this is the right way to do it.

So you can call functions within by doing:

```
import a from './api.js';

a._something();
a.ccall('something');
```

If you do direct calls you must do the type conversions yourself, otherwise you need to use ccall to convert JS types to types that the C function understands. Alternatively there's cwrap.

Integers and floating point values can be passed as is. Pointers are integers in the generated code. Strings must be converted to pointers for the compiled code. The relevant function is `Pointer_stringify()`.

```js
import a from './api.js';

str = a.allocate(a.intArrayFromString('abc\n'), 'i8', ALLOC_NORMAL)

a._printthis(str);

a._free(str);
```

It's really important to know about line buffering, though I'm not sure how to switch that of in emscripten.

So you can see not using crwrap is kind of difficult, especially if we want to pass more complicated structures around.

Since the string is allocated into the heap using the special allocate function, you need to then free it later on, or else the memory will stick around.

The usage of `Module` refers to the required module when brought in, it is the outputted ASM.js's surrounding object that supplies a bunch of utility functions like `ccall`.

Alternatively:

```
// void functions for C should be null, (apparently undefined can also be used)
a.ccall('printthis', null, ['string'], ['abc\n']);
```

This will do the conversion for us, so that's more simple, we should be able to write wrappers around the functions that we want to use and then just call the wrappers of course. Furthermore... the only types supported to be passed into the C functions are `number`, `string` and `array`. How does this work with regards to structs and objects?

Note that unlike the direct calls, the ccall will allocate onto the stack and then deallocate when the function is complete.

An alternative to the macro `EMSCRIPTEN_KEEPALIVE` is to pass the list of exported functions to the emscripten compiler.

Note that 64 bit integers in C will be 2 32 bit parameters, is this automatically compiled? Note that the return type cannot be array, only `number` and `string` are supported. How do you return a pointer to an array then? Is it just a number then? How do we traverse or typecast it to a typed array of some sort?

There's also an async option that implies that the ccall will perform an async operation. Then if so, there is no return of value, I suppose a pointer to a callback will be needed.

```
c_printthis = a.cwrap('printthis', null, ['string'])
```

It's really just partial application.

Ok so you can choose to allocate onto the heap, and then free it later on, `_free` is the counterpart to `_malloc`, but instead of using `_malloc` directly you can use the `allocate`, and choose where and how to allocate. If you prefer stack allocation and deallocation, there's an advanced of these functions that is provided via ccall and cwrap, but the idea is there `Module.Runtime.stackSave` and `Module.Runtime.stackRestore` are the key. As usual doing a heap allocation once without needing to free things is the fastest! But generally thing should stack allocated to avoid syscalls (in normal C) but since we are in JS, this doesn't matter, we always have malloc right...? Stack allocations and heap allocations both involve malloc in some way right?

http://kapadia.github.io/emscripten/2013/09/13/emscripten-pointers-and-pointers.html

What about returning inline structs!?
