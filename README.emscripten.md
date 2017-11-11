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

---

I think the main idea will be to compile libgit2 (preferably with dynamic linking enabled) and its dependencies independnetly, and create JS wrappers around the calls, and then expose the end result as a cjs or es6 module.

So to do this, we should have the base modules available as separate emscripten packages.

The end result is that Nix shell can join it all together as separate emscripten packages, and we build a complete js package. That is statically linked together in the end. (Or left for dynamic linking). Not completely sure.

So we need to understand how the cmake works and then see how to integrate that.

---

CMake uses the file `CMakeLists.txt`. The main commands to use are:

```
mkdir -p build && \
cmake ./path/to/src && \
cmake --build .
```

So that's simple enough, the first command generates the build files according to some settings, it's kind of like configure. While `cmake --build` is like `make`. But I don't know what is the equivalent to `make install`.

The language is like C macros.

```
PROJECT(libgit2 C)
CMAKE_MINIMUM_REQUIRED(VERSION 2.8)
SET()
```

The set command sets variables up. Common variables are like:

```
SET(CMAKE_BINARY_DIR ${CMAKE_SOURCE_DIR/bin})
SET(EXECUTABLE_OUTPUT_PATH ${CMAKE_BINARY_DIR})
SET(LIBRARY_OUTPUT_PATH ${CMAKE_BINARY_DIR})
```

So here the `CMAKE_BINARY_DIR` means that if you are building in-source, this is the same as the `CMAKE_SOURCE_DIR`. It's the top level directory of your build tree. While `CMAKE_SOURCE_DIR` is the directory where the `CMakeLists.txt` was found. A key feature of cmake is the ability to make multiple builds from a single source tree. Unlike autotools which appears to prefer building within the source tree and creating lots of junk. This is something that's expected for most modern build systems now.

So if you're building within the same source, then both variables should point to the same place.

So apparently others just used the cmakelists file but overrode some variables like:

```
cmake .. \
  -DCMAKE_SIZEOF_VOID_P=4 \
  -DCMAKE_C_COMPILER="emcc" \
  -DCMAKE_AR="emar" \
  -DCMAKE_RANLIB="emranlib" \
  -DCMAKE_C_FLAGS="-s LINKABLE=1" \
```

So the `-s LINKABLE=1 -s EXPORT_ALL=1` would make the system export ALL functions including libc functions. I think this is a bad idea, and we don't need this. But we do need to define functions to be kept, which should be everything exported by libgit2. But there's a whole lot of functions!?

So perhaps we should use exported function list according to the libgit2 version, we're going wrap the thing in JS anyway. Remember we still need a JS wrapper that mediates all the calls, so since we are going to specify all of this, then this means the list of functions will have to be listed in our own cmake lists, and in the js wrapper. I don't think we should be exporting all of it, also we cannot use the emscripten macro, because we are not writing direct C.

Apparently we can mount a VFS instead of having to write the wrappers:

```
const vfs = new VirtualEmscriptenFS;
Module.FS.mount(vfs, {root: '/'}, '/');
```

We just need to match the interface assumed by `mount`

So emscripten decides automatically whether to include FS support. Many programs don't need files, so that is not installed. However it will normally JUST work. However to force inclusion, you will have to set `-s FORCE_FILESYSTEM=1`. When I do this with my simple program, all I get are extra functions, but not the FS module in itself.

Oh no this doesn't actually work, firstly emscripten doesn't allow mounting at root. Furthermore the FS object isn't accessible to JS after compiling. Instead you just have to state the FS mounting code in your main.c, but I do not have a main.c!! What the hell. See this issue for more: https://github.com/kripken/emscripten/issues/2040 Ok instead of doing this, we just have to use the ODB and REFDB. But if we don't implement that in C, then how do we do it? Maybe we can compile the 2 and link them together? That is compile libgit2 and export a whole bunch as JS?

Maybe we can just use git2.h, everything there should be exported as that provides the types for everything!

https://github.com/libgit2/libgit2/blob/master/include/git2.h

Why can't emscripten traverse the headers here and export everything these headers export?

Exporting the functions is not so simple!!!

The other issue is ports vs emscripten-packages vs statically building from the provided source from cmake. For example we have 4 sources of zlib available to us:

1. Nixpkgs zlib
2. Nixpkgs emscripten-packages zlib
3. -s USE_ZLIB emscripten port
4. libgit2 embedded zlib

Apparently the flag will perform a network based download of the port, that may not be desired, since we can make use of nixpkgs to supply the port, but at the same time, during development, this may be better, but only when packaging for nixos, should we then set it to use the zlib from emscripten-packages, which requires disabling this flag in the default.nix. One problem with this, is that how does this interact with the cmake flags, like how do we then make sure that it finds the correct zlib. Last time I did a native build, it autodetected zlib was available from nixpkgs, and just used that instead of the embedded zlib. It was done via cmake `FIND_PACKAGE` command. So if we were to use the emscripten ports system, it would have to be able to disable the find package command or override it so it used the zlib port instead of its natural way of finding packages in the current shell environment.

The docs say that if you use the ports, the emcc will fetch it remotely, set it up and build it locally, link with the project, add the necesssary includes to the build commands. (Of course if we rewrite the cmakelists, then we can disable the usage of zlib like that).

There's a command called `emcmake` that apparently configures cmake to target emscripten directly. I wonder how it deals with things like `FIND_PACKAGE`. It appears it all it does is perform the configure command, which is quite strange.

According to the docs here's how you would build together 2 C projects and statically link them together:

```
cd /libstuff
emconfigure ./configure
emmake make

cd /project
emconfigure ./configure
emmake make

emcc /project/project.bc /libstuff/libstuff.bc -o final.js

# or

emcc /project/project.bc /libstuff/libstuff.bc -o allproject.bc

emcc allproject.bc -o final.js
```

So yea each project can be individually compiled and then brought together into 1 system. But if you wanted to modularise them as dependencies, you have to consider how to setup C dependencies, which are usually based on dynamic linking. But C can also statically link to shared objects. Oh apparently you cannot. You need a static library to do the linking either `.a` or `.o`. A shared library `.so` is actually an executable in a special format with entry points specified. It does not have all the information needed to link statically. So you cannot statically link a shared library nor can you dynamically link a static library (I suppose you can bundle libraries together though at a different level of abstraction (statifier, ermine, container image, virtual machine)). Using the `-static` flag, it will pick the `.a` library over the `.so` but static libraries are not always installed by default. I wonder if most nixpkgs packages supply both the shared object and the static archive. Note that `.o` is not the same as `.a` but `.a` can represent a bundle of `.o`. Note that you can however convert a static library to a shared object, this uses the `--whole-archive` option, which can contain a static library in a shared object. Oh so most libraries on nixpkgs are distributed without static archives, they usually only contain shared objects. I just checked with curl and libssh2 brought in via nixpkgs.

However, the reason for this is most of the time you don't need the static archive, so they kept this out of the main store path. In fact there's a flag called `dontDisableStatic` which is part of the configure phase, this means that by default Nix uses `--disable-static` setting so that the resulting build doesn't produce the static archive. By default according to autotools (specifically the activation of libtool), the shared and static versions should be built, but one or the other can be disabled. So there's also `--disable-shared` as well.

So I see that this means it would be nice to have a package hook for nixpkgs specifically for emscripten packages that deals with bc or bitcode output. Since that is generally considered the universal object format for emscripten, so emscripten doesn't deal with `.a` or `.so` but just with `.bc`. Actually according to the docs, it's possible that the make file from emmake may decide to emit `.so` or `.a`, but it's best to try to emit only `.bc` to avoid confusion. In fact we should make sure that emscripten-packages are being used.

Ah so that makes sense then, of course there wouldn't be 2 different object formats for emscripten. There's only really `.bc` and `.js`, with `.js` representing the final executable. However the key point is that there's no such thing as compile time dynamic linking on emscripten, because there's no filesystem that you just libraries upon program load. Instead you always generate `.bc` until you generate the final `.js`. It's just that it is possible for 2 or more `.js` outputs to communicate with each other. Thus that's basically emscripten's form of dynamic linking, basically having multiple `.js` asm modules, loaded into the browser or required in nodejs, to communicate with each other. However I'm not sure whether dynamic linking is still completely figured out in fastcomp version!

But if it worked, then static linking for libgit2 would look like compiling all the other dependencies into `.bc` files. Adding those into an environment hook in nixpkgs (emscripten would have a package hook). Then using emscripten to compile the current package into `.bc` as well or into `.js`. You would make this produce a `.bc` if you wanted this to available later to other systems and be part of the emscripten packages. Or you produce the `.js` if this is the final executable. Whereas for dynamic linking, you would produce the `.js` for each library. Finally here you would also produce a `.js` which somehow calls into the other `.js` files and expects them to be there when running in the browser or nodejs somehow. And you can use the `--save-bc` to essentially also produce the `.bc` while producing the `.js`. While using the `-c` will always force the production of `.bc` instead of `.js`. It makes sense, in the compilation vs the linking phase.

Oh I just found that there's also `-s EXPORTED_GLOBALS` which has global non-variable functions that are explicitly exported. This is important for non-functions like variables. But what about constants?

Since we're dealing with crypto we may need `-s PRECISE_I64_MATH=2` and `-s PRECISE_F32=1`. This will slow it down but will be precise.

You can also `-S FORCE_ALIGNED_MEMORY=1` and see if it all works, this should be true for good proper C code.

So you cannot load the C header into JS, and make use of it's constants and stuff directly in JS. Instead you either have to manually translate all of header into relevant object contants and properties exported by your own JS code, so that downstream systems can access these properties. Damn I was really hoping emscripten would have a solution to processing the header exports. It seems while there is not documentation on exporting non-functions from C to javascript, there is docs on exporting non-functions from C++ to JS using embind. That's weird, I wonder if I can use embind for C as well. There's stuff on constants and structs and stuff there!

Also try `-s MODULARIZE=1`, even though this shouldn't matter because we're going to use rollup to bundle it all together.

So above I had talked about the FS mounting problem, being that 1. I cannot remount root, and 2. I cannot access the FS object outside of emscripten. But number 2 maybe solved with `--pre-js` but I'm not sure.

Oh embind does require the `--bind` option on emcc, and a C wrapper rather than the JS wrapper. So this would mean we need 2 levels of wrappers if we use `--bind`.

Ok, so let's take a look at how emscripten-packages work.

This post illuminates the usage of emscripten-packages: https://github.com/NixOS/nixpkgs/issues/15873

There's an environment variable called `EMCC_LOCAL_PORTS` which seems to work together with emscripten-packages.

So I just installed the emscriptenPackages.zlib. And this is what it gives me:

```
nix/store/*-emscripten-zlib-*/
nix/store/*-emscripten-zlib-*-dev/
nix/store/*-emscripten-zlib-*-static/
```

So it looks like the emscripten stdenv does decide to emit the static!

The dev has 3 directories: include, lib and nix-support. Theinclude contains zconf.h and zlib.h. This makes it equivalent to a C header. While lib has pkgconfig that has pc code that tells us about the out directory, in there we see that `$out` actually does not have a lib. Remember here for libraries the $out/lib has nothing, which makes sense since emscripten doesn't produce shared objects anyway. The only thing that does exist the static directory which does have a lib containing `libz.a`. But note that this means pkg config is not properly configured since it does not point to the proper static directory. I don't think it's right for the static output to be in its own directory, unless all the pkgconfig is fixed to support static designations. Using hexdump, we can confirm that it is infact a llvm bit code, when looking BC.

Ok so that confirms that a static `.a` is outputted from emscripten package even if it's in a special static library. However this path is not added to the pkgconfig nor is it part of the NIX_LDFLAGS. Since the headers are available, these headers are part of the `NIX_CFLAGS_COMPILE`.

Ultimately to make use of the static library, one has to use `${emscriptenPackages.zlib.static}/lib/libz.a`. There's nothing hooking that into the shell environment.

Since the emscripten packages issue on Nixpkgs is not resolved, and using it would mean builds would only work on Nix, I think it's better to not bother here with emscripten packages atm, and focus on bringing in the dependencies as submodules directly here.

Ok here's the plan.

We're going to play around with embind with just normal C files, and see what we can do here. If it works, we'll use embind on just libgit2 without any other dependencies. It should just work with emcmake (even though I don't really know what it does). For now we should also remove the shared object dependencies, since they might just confuse things.

Should also add:

```
--output_eol linux
```

Always.

Also when emscripten supports overloading the rootfs, I can ditch the pluggable backend, and instead just directly overwrite the internal FS using this: https://github.com/jvilk/BrowserFS/blob/master/src/generic/emscripten_fs.ts But instead of BrowserFS, I just use VirtualFS.

Cmake has modules such as `CheckLibraryExists` or `FindPkgConfig`. These are all scripts designed to find these things in the current environment looking at environment variables.

`OPTION` is for declaring variables that can be set by the user via `-D` flags. We have these options:

```
SONAME - set the version of the shared object
BUILD_SHARED_LIBS - build for shared library, off for static - what does this mean??
THREADSAGE - on by default
BUILD_CLAR - build test cases
BUILD_EXAMPLES - build examples
TAGS - not sure
PROFILE - no need for this
ENABLE_TRACE - no need for this
LIBGIT2_FILENAME - no need for this

USE_SHA1DC - use sha1 with collision detection
```

The latest libgit2 is intending to integrate mbedtls. This may mean it is unnecessary to link to openssl. This is being driven by Ubuntu and Debian who don't link into openssl for some reason. However HTTPS still requires a designation of the certificate store. This should be provided by the OS. But I'm not sure how this translates to emscripten. It will be set by an environment variable `-DCERT_LOCATION` when mbedtls is integrated. However this means you'd need to represent an emscripten filesystem, and would have to embed the certificates into the resulting `.js` file.

https://github.com/libgit2/libgit2/pull/4173#issuecomment-325756802

But mbedtls is not yet available, so we just cannot activate HTTPS yet here!


```
-DUSE_SHA1DC=ON
-DBUILD_SHARED_LIBS=OFF
-DBUILD_CLAR=OFF
-DBUILD_EXAMPLES=OFF
-DUSE_SSH=OFF
-DUSE_OPENSSL=OFF
-DUSE_ICONV=OFF
-DUSE_GSSAPI=OFF
-DCURL=OFF
-DCMAKE_BUILD_TYPE=Release
```

When `BUILD_SHARED_LIBS` is enabled which it is by default, it will set `-fPIC` as part of cflags, and if supported, it will use `-fvisibility=hidden`. We are not building a shared object, but we're also not building a static library in the native fashion so we should disable this. Since these options means nothing for us. Note that with `-fvisibility=hidden` it inverts GCC behaviour with regards to exporting a function, any function not explicitly marked as exported becomes internal, unlike the default behaviour.

Since we're writing a c wrapper using embind, we need to also make our own cmake file right? Well... I'm not sure. Well emscripten should pass those in to compile the libgit2 source into a bitcode file, while then also compiling our own libgit2 wrapper into bitcode, and finally joining them together. So I think this can be done with a shell script instead of another cmake! Pkgconfig doesn't matter and we shouldn't need to bring it in.

What does `USE_SHA1DC` do? It results in extra flags sent to the compiler, specifically `GIT_SHA1_COLLISIONDETECT` also no standard includes, and also brings in common.h. I think this results in a more robust git. I think we should enable it.

I found how setup hooks are done, they are specified as part of the stdenv.mkDerivation: `setupHook`. This can point to a shell script with a number of exported functions. This means when some other package puts the package into their build inputs or native build inputs, the setuphook gets executed, and usually this is useful for build tools that are placed in the build inputs of a shell.nix or a default.nix. The manual doesn't specify that cmake also exports setup hooks. Note that I think the setuphook is only executed during fixup phase, or something else. Because else I would see some messages upon running nix-shell. Adding the setuphooks actually makes those functions available to cmake's own derivation. But I'm not sure how that works with the package as a build input to subsequent systems. The list of setup-hooks in Nixpkgs is at `pkgs/build-support/setup-hooks`, however not every hook is specified there such as cmake's setup hooks.

This explains the different ways of finding package using cmake which includes pkg-config:
https://stackoverflow.com/questions/25959972/what-is-the-difference-between-find-package-and-pkg-search-module

Note that when using `emcmake` I think it uses the `Emscripten.cmake` that overrides some cmake flags such as the size of a pointer, preferring to build 32 bit architecture because JS doesn't have 64 bit integers. https://github.com/kripken/emscripten/blob/master/cmake/Modules/Platform/Emscripten.cmake

Oh it says to make use of it, invoke cmake with: `-DCMAKE_TOOLCHAIN_FILE=<EmscriptenRoot>/cmake/Modules/Platform/Emscripten.cmake`. I wonder if this has any relationship to `emcmake`. Oh you also need `-G` option to make it generate Unix makefiles, so that you can then just run `make` normally. It doesn't generate it by default? Oh it does. But we still end up using `cmake --build` Why? Oh using `cmake --build` abstracts the native build tool's command interface with extra options such as directory and target, config, and clean first.. etc. So under the hood it still uses the generated build system. If you don't specify the generator, it will auto choose one. I see.. this is why using `cmake` then `cmake --build` is more platform independent. So `-DCMAKE_BUILD_TYPE=MinSizeRel` is still going to be needed.

Oh we need the `$EMSCRIPTEN` environment variable or `$EMSCRIPTEN_ROOT_PATH`. But it appears that emscripten doesn't set a setuphook to define these variables. So we have to create our own shell hook for this then. These things aren't well documented, but it does need to be set for a number of other tools to end up working. Especially since the cmake script is also part of this same thing. It's in specifically the share part. I wonder if you can load it as a module.

So I can see that cmake definitely sets up some setuphooks to set `CMAKE_INCLUDE_PATH`, `CMAKE_PREFIX_PATH`, and `CMAKE_LIBRARY_PATH`. These three environment variables affect the `FIND_XXX()` commands. Eitheras find file or find program or find library or find path. It turns out that emscripten is part of `CMAKE_PREFIX`. I don't think in this case you can load the cmake emscripten from these paths though, and besides that would require the usage of a module, which doesn't make sense to me yet.

Ok so you actually do `emcmake cmake -DCMAKE_TOOLCHAIN_FILE`. I guess you can just do `emcmake cmake --build` afterwards too.

An issue on emscripten says that `emcmake cmake` is the same as `emconfigure cmake`. And that it also passes the module path and defaults to MinGW generator.

The correct root path should be `${emscripten}/share/emscripten`. All of the bin are actually symlinks pointing to this location.

It appears that the `-DCMAKE_TOOLCHAIN_FILE` is not needed, it already sets it properly.

It appears I get warnings about incompatible pointer type, and also a warning that emcc cannot find library rt. Lib rt is for real time library, it's for being able to get the clock time. This is due to a check inside which adds `-lrt`, however of course emcc cannot find this, and so doesn't bother with it. That's fine, it appears to work without it. Not sure about the incompatible pointer type, these warnings did not occur on the native build.

```
emcmake \
  cmake \
  -DEMSCRIPTEN_GENERATE_BITCODE_STATIC_LIBRARIES=ON \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DUSE_SHA1DC=ON \
  -DBUILD_CLAR=OFF \
  -DBUILD_EXAMPLES=OFF \
  -DUSE_SSH=OFF \
  -DUSE_OPENSSL=OFF \
  -DUSE_ICONV=OFF \
  -DUSE_GSSAPI=OFF \
  -DCURL=OFF \
  ../libgit2
cmake --build .
```

Woot, this produces a `libgit2.bc`. It's done!!!! Note that since we produce bitcode, no dead code elimination was done unlike had we tried to produce `.js` immediately.

Now we that we have this, we can proceed to try to compile or embind C wrapper, that calls into VirtualFS and implements the ODB and RefDB (hopefully that works). And it will all work!

Furthermore this style means it should be possible to then produce the other libraries in bitcode style and link them together. The problem being is that cmake may not find it. I'm not sure how you would make cmake find those libraries, but it may require some fiddling with the cmake environment variables so those libraries (which could be in bitcode form as well) may be found. Otherwise they may have to be left as `.so` or `.a` even though that's confusing.

I wonder how do we pass flags directly to the emcc, so to activate all the optional settings required, such as to enable proper math. Right now `cmake --build .` just runs the emcc directly. Oh those flags in settings.js doesn't matter until the final linking to `.js` executable format. So we don't have to enter those until much later!!! You still have the final `emcc -s OPTION=VALUE -s OPTION=VALUE` call.

Note that the pointer warnings should be fine, it is possibly a consequence of the emcc forcing 32 bit pointers, but `unsigned int *` is always compatible with `unsigned long *`.

Follow this issue!

https://github.com/kripken/emscripten/issues/2655

---

```
# compile our own embind wrapper
emcc \
  -O2 \
  libgit2_wrapper.c \
  -o libgit2_wrapper.bc

# compile both the wrapper bitcode and the llvm bitcode into the final js module
emcc \
  -O2 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=libgit2 \
  -s FORCE_ALIGNED_MEMORY=1 \
  -s PRECISE_I64_MATH=1 \
  -s PRECISE_F32=1 \
  -s VERBOSE=1 \
  -s ASSERTIONS=2 \
  libgit2_wrapper.bc \
  libgit2.bc \
  -o libgit2.js
```

Oh a list can be read from a JSON formatted list of functions like `["_func1", "_func2"]`... The specified path will need to be absolute however!

Oh the same optimization flag must be turned on for converting to bc as well as converting to JS. So if we are using `-O3` for taking bitcode to javascript, this same option must be available for the emcc during compilation to bitcode. I found it, in the `Emscripten.cmake` setup, it will say that `Release` is done with `-O2`. While `MinSizeRel` is done with `-Os`. There are none with `-O3`. Is there a way to override this ourselves? The relevant flags to override are:

```
CMAKE_C_FLAGS_RELEASE
CMAKE_CXX_FLAGS_RELEASE
CMAKE_EXE_LINKER_FLAGS_RELEASE
CMAKE_SHARED_LINKER_FLAGS_RELEASE
CMAKE_MODULE_LINKER_FLAGS_RELEASE
```

I get that the `C_FLAGS` will be relevant here, but I'm not sure how this relates to the EXE, SHARED or MODULE settings. Perhaps for our case only the C_FLAGS is important, but I think all of them needs to be set appropriately. Since shared might be for the linker to do `.so`, while module is for the linker to do `.a` and exe is for the linker to do the final executable. While the `C_FLAGS` is only for compiling to an object file, in emscripten all of these lead to a bitcode, unless the cmake is intended to produce the final executable, in that case the EXE flags would be important. Wait apparently there's also a `CMAKE_STATIC_LINKER_FLAGS`. Ok so what the hell is module? Maybe it relates to Cmake modules, and some cmake modules requires building? Ok now that these are set, how do these get changed according to command line parameters? So Cmake variables are separated between normal variables and cache variables, it turns out that cache variables will be cached into a file called `CMakeCache.txt`, the values here can be edited by the user later to change if necessary. So we can change the optimistion flags here, but it's also not nice, as I would have preferred to be able to set it as an option on the command line. Because these settings were set using `set` and not `options.` Then it doesn't work nicely to be able to override it. So we just have to along with it then.

The final step from bitcode to Js involves JS optimisations. Whereas if no optimisations are set in the source to bitcode, all llvm optimisations are omitted. Different build systems expose different ways of achieving optimisations, so we need to see how this is done.

So we can use `libgit2.so` or `libgit2.a` I think, it all works, but `.bc` should be used when possible.

We can use npm run build to do this for us. But the main idea is that the build occurs directly through a few shell commands.

We also need to set the include path appropriately. We could write our own make file, so that emcc will correctly set the include paths or something else, but where does the libgit2.bc get found. Note that I think variables such as the include path and linker path is probably set the same way gcc is done. So you can always get includes as a current directory, but other than that, this should be done correctly using just `git2.h`. And set the correct include path on the command line. Specifically we should be adding `libgit2/include` as an include path to our emcc compiler. Since our libgit2 was part of the same source repo and not brought in from nixpkgs emscripten-packages, then this will need to be manually in our shell.nix or whatever.

I'm not sure how to get the optimisation flags into the cmake there.

So let's just stick with `-O2` here for now.

---

So I just found out that the usage of embind requires the usage of C++. So instead of writing a C wrapper, you have to write a C++ wrapper, which instead requires `libgit2_wrapper.cc`. Then to use C headers, you would have to bring in `#include <cstdio>` (removing the `.h`, and prepend `c`). However for normal C headers you have to do `extern "C" { #include "someheader.h" }`. It doesn't seem like I should need this though. But namespace declarations become important.

This is not a show stopper, but I need to find out what does the `extern "C"` do.

It makes the function name in C++ have 'C' linkage. This means the compiler doesn't mangle the name. So that client C code linkt o it.

Since C++ has overloading of function names and C does not, the c++ compiler cannot just use the function name as a unique id to link to, so it mangles the name by adding information about the arguments. A c compiler does not need to mangel the name since you cannot overload function names in C.

When you state that a function (which would be the function declaration in a C header) has extern 'C' linkage in C++, the C++ compiler does not add argument/parameter type information to the name used for linkage. So in a library written in C++, you can add them into an `extern 'C'`. And that should make the function declaration linkable by C. It's possible to do things like:

```
extern "C" void foo(int);

extern "C" {
  void g(char);
  int i;
}
```

This makes `foo`, `g` and `i` all non-mangled.

In the case of our C++ wrapper do we need to do this with the git2.h? When calling a C function from C++ or calling a C++ function from C, the C++ name mangling causes linking problems. Technically speaking, this issue happens only when callee functions have already been compiled into a binary (such as our llvm bitcode). So we need to use `extern "C"` to disable the name mangling when we're compiling our C++ source code.

Using `#include <cstdio>` will import the necessary IO functions into std namespace and possibly the global namespace.

Both emscripten.h and emscripten/bind.h will export C++ API as well, so we don't need to put that in an extern C, only our git2.h will need this!

Forcing aligned memory is not compatible in fastcomp, and I cannot use modularise nor export name. The modualrise just means that it gets set as a function. And export names keeps complaining about some name not being set.

You need `--bind` at the compilation to `.bc` and at the compilation from `.bc` to `.js`. I wonder if this is required for dependencies as well?

Using the `EMSCRIPTEN_BINDINGS` it automatically creates the relevant function adapter for JS, so I believe it does this via stack allocation then, so it's a bit more higher level.

It appears simple string capability doesn't work, there's some error about allowing raw pointers.

There's the use of `val` function in the test.

While embind will allow raw pointer usage through passing `allow_raw_pointers()`. The way you call in JS involves some explicit memory management. I'm guessing that you still need cwrap or ccall or something like that. Actually ccall and cwrap seems not to be able to work with embind raw pointer functions. Not sure how to actually call a raw pointer usage even after allowing it. It appears that embind just isn't designed to support this use case yet. However it appears this can be done with extern C however. Yep this is possible, as long as you do it in an extern block. Ok...

So we just have to play around with embind and see if we can do progressively more complex things like arrays and structs and objects and stuff like that.

Really all the good tools are about C++ to Javascript!

In C++ it is possible to access the JS global context by using `val::global("Promise")`. Things like that.

Once you have a JS value, it's possible to use template polymorphism and cast them to a C++ value with `something.as<bool>` or `str.as<std::string>`.

With a JS object you can call the constructor by doing this: `something.new_()`. Not sure if it's a convention with `new_` for JS calls.

If a JS object has a function that you can call, or methods. You would do this with val: `context.call<val>("someMethod")`. This is basically `context.someMethod();`. The return type will be put in `<>`. Here it says return something that turns back into a JS value. But you can also use `<void>` when the result is undefined. What about null? Perhaps.

THe nyou can also set properties like `jsobject.set("type", val("something!?"))`. This is basically `jsobject.type = "somethiong";`.

You can then access properties simply with `context["someKey"]`. So in a way this array index access is a bit strange. It basically means Js objects are also like C++ maps, so string indexes are used like that. That's pretty cool.

You can also pass things like `-Wall -Werror` to your own functions! Yea this should be used for own git wrapper so we enable all error checking and show all warnings!

Type conversions also work in embind like this:

```
void -> undefined
bool -> true/false
std::string -> ArrayBuffer, Uint8Array, Uint8ClampedArray, Int8Array or String
std::wstring -> String
```

Everything else is a number.

For convenience we also have factory functions to register `std::vector<T>`. Also I don't know what this means is this providing access to vectors and maps to JS or something else?

So you can export classes like:

```
EMSCRIPTEN_BINDINGS(base_example) {
  emscripten::class_<BaseClass>("BaseClass");
  emscripten::class_<DerivedClass, base<BaseClass>>("Derived Class");
}
```

Now any functions are going to be available on BaseClass as well as DerivedClass. Ok so this exposes classes to JS. And I suppose those register functions also exposes the ability for JS to create maps and vectors.

Embind currently cannot export overloaded functions based on type, instead you have to select the correct implementation.

```
struct HasOverloadedMethods {
  void foo();
  void foo(int i);
  void foo(float f) const;
}

EMSCRIPTEN_BINDING(overloads) {
  emscripten::class_<HasOverloadedMethods>("HasOverloadedMethods")
  .function("foo", emscripten::select_overload<void()>(&HasOverloadedMethods::foo))
  .function("foo_int", emscripten::select_overload<void()>(&HasOverloadedMethods::foo))
  .function("foo_float", select_overload<void(float)const>(&HasOverloadedMethods::foo));
}
```

So embind can auto translate types, but nothing is auto translated to structs, this is why we need a C++ wrapper to essentially take in a val of an object, and then convert that into a struct. By filling in the interface and passing that to the C function. I wonder if we export a type that we just declare but not define, what things may be mentioned?

It's easy enough to export macros.

When you export a struct, you don't actually get their reference anywhere, it appears they just get used along with a function.

Oh cool, it works even if all we have is a function declaration without definition. The final compilation to js is where it complains that iwas not able to find the symbol for that declaration, when it does the linking together. So the final process is when it's important to get all the bitcodes together, and link them all together, in build system, this would be done with their environment variables like CFLAGs and stuff. That's if you were using CMake as well or autotools, but that's a bit weird in a node npm package.

Ifwe use `extern "C"` for the git header, then these names are not mangled. Will these names be made available to the resulting EMSCRIPTEN_BINDINGS and `e::function("somename", &thename)`? I don't know...

Yes those declaration names will be resolved from the `EMSCRIPTEN_BINDINGS` so now we don't have to use `EMSCRIPTEN_KEEPALIVE`. Yes so cool!

Although since you cannot export a struct directly, you can export a constructor a struct. So I guess that's how it kind of works? Also since a struct is a type, I guess it doesn't make sense to export the struct directly.

Note this is the main reason why integrating libgit2 and virtualfs may be complicated: https://github.com/kripken/emscripten/issues/2040

When using `-O2`, libgit2 will produce both the `.js` and `.js.mem` at the end. This may be undesirable, because when bundling with rollup, it's possible rollup won't know about this file. Further more when loading into the browser, both files will need to be loaded indepedently. The basic reason for this is that large JS files may have problems when loaded by the browser. I think this optimisation is not necessary for libgit2.js, so we should just do: `--memory-init-file=0`. However this is only needed on the final compilation to `.js`. Note that there's also a `Module.memoryInitializerPrefixUrl` that can point to a particular location of the `.js.mem` file which can be loaded by the browser, but again this doesn't seem relevant to non-browser usage. https://github.com/kripken/emscripten/pull/5296 This may not actually matter in the end, we will need to test whether this actually matters.

We need to understand how the C++ to JS works via embind, because if there's a way to use VirtualFS that would be through this method.

Ok so the Module object has a `preRun` concept. Which is an array of functions to call just before calling `run()`. This is useful for setting up things for the Filesystem. This is the proposed way of integrating BFS into Emscripten. But how does this work for cjs require? There's also the fact that you can set the `Module.ENVIRONMENT` property to `WEB` or `NODE` or `SHELL`... etc, this may be required by module bundlers like webpack or rollup, but how is this set when we do a CJS require of the final library in the a wrapper? There is no main function! Ah the way this is done is using the `pre-js` option! It adds JS code that can define or extend the Module object! So this is what we use such that it works even in a cjs require. Note that `SHELL` I think is for HTML output? Oh no, SHELL means it's not running in a browser and not running in Node.js, so it's useful for non-node interpretation environments like Rhino or things like NativeScript. Ok so because this might run in Node and other non-Node, then really we need to only use `SHELL` and `NODE` environment. Anyway, we may not need to do this. But any playing around with this would happen with the prejs option.

So it works, the `--pre-js` works! Ok so some functions can then be executed like this:

```
var Module = {
  preRun = [
    function () {
      var vfs = new VirtualFS;
      var evfs = new VirtualFSEmscripten(vfs);
      FS.createFolder(FS.root, 'data', true, true);
      FS.mount(evfs, { root: '/' }, '/data');
    }
  ]
};
```

Notice how the function is able to use of the global variable `FS`, which would be available to be in scope at that function, but the FS object doesn't seem to be exposed. What if we wrote a funtion to return the `FS` instance?

We are able to return the internal FS instance by adding a function to the Module object and returning the FS. The FS has a filesystems property that includes multiple implementations of the FS. However none of them match Node's FS api, as it wasn't designed for it. Instead, the thing is, `FS.filesystems.MEMFS === FS.root.mount.type`. So it seems by finding the right hijacking point, we can overrite the MEMFS implementation just before it is used, and make it instead use VirtualFS. However we now need to adapt VirtualFS to be Emscripten compatible so we create a `EVirtualFS` wrapper around `VirtualFS` to meet the expectations of the Emscripten system.

Using the `EM_ASM` you cannot access C variables. And you cannot return value back. However there is `EM_ASM_ARGS`, `EM_ASM_INT`, and `EM_ASM_DOUBLE`.

Using `EM_ASM_INT` allows you to write inline JS that accepts arguments of int or double, and returns an int. Whereas `EM_ASM_DOUBLE` does the same but returns double.

For example:

```
int x = EM_ASM_INT({
  console.log('I received: ' + [$0, $1]);
  return $0 + $1;
}, calc(), otherCalc());
```

If you only just receive output without inputting anything use the `EM_ASM_INT_V` or `EM_ASM_DOUBLE_V`.

I'm not sure but what about `EM_ASM_` and `EM_ASM_ARGS`?

Apparently strings can also be passed, but more complicated things like objects cannot. It seems that the ability of C to call JS is quite limited.

There are types to use in callbacks, and these are C types, that you can type a particular function, supposedly if a C code returns a function back to JS, that's what it would have to do!

So embind can be used, but also preamble.js and also `Module.Runtime`, which gives low level runtime functionality.

It's possible to expose a C function that utilises eval, basically it can take scripts and then eval JS inside the Emscripten module. This can be disabled, but prevents the usage of `embind`, so I cannot disable dynamic execution.

There may be some integration points in preamble.js and related to prejs.js for us to utilise VirtualFS instead of MemFS. But remember there may be some other functions that we need to support.

The `emscripten_set_main_loop` will set a C function as the main event loop.

Other functions relate to the JS runtime and environment and providing these pieces of information to the C. Like `emscripten_get_device_pixel_ratio`.

Also functions related to indexdb and functions related to web workers.

And relevant equivalents to AJAX exposed in the form of C functions like `emscripten_wget`. All of this is part of the `emscripten.h`.

We can get the compiler settings via `emscripten_get_compiler_setting`. Useful things are usually related to debug level, optimisation level and emscripten version.

---

Relevant to us is the socket event registration.

Events here are analogous to websocket events, but are emitted after the internal emscripten socket processing has occurred. This means for example that the message callback will be triggered after the data has been added to the `recv_queue`, so that an application receiving this callback can simply read the data using the file descriptor passed as a parameter to the callback. All of the callbacks are passed a file descriptor representing the socket that the notified activity took place on. The error callback also takes an int representing a socket error number like `errno` and a `char *` that represents the error message.

This all occurs on the `Module` object. That is you can define things like `Module['websocket']['on']('error', function () {})` that basically attaches a function to the error event on websockets. I suppose this can also be done dynamically and does not need to be set statically at the prejs.js. So this a custom functionality added to the Module object, but this a weird design to have certain things usable from C, and certain things usable from JS. Instead perhaps a JS specific stdlib should be have been used and then exported to both C and JS, so both can share the underlying objects.

So while `emscripten.h` deals with the Emscripten runtime and Emscripten settings. `html5.h` allows C/C++ to bind into HTML events. Basically it's the DOM library in C/C++.

JS APIs defined in `preamble.js` exposes capabilities to the JS side to call into C/C++, basically the compiled stuff that emscripten has done. It has some relationship to embind I guess, but embind goes beyong `preamble.js`. Perhaps this is where the filesystem is initially initialised (with the new objects and stuff).

Within the `preamble.js`, it uses a `maybeExport` to export the all the functions that are available on the `Module` object. And it's funny how `allocate` is documented to be for advanced users, while `_malloc` is documented for user usage, this is weird naming mistake? But there's also `_free`. So I can see that `preamble.js` definitely sets up some initial functions as part of the `Module` object. When `NO_FILESYSTEM` is a macro, then a bunch of functions that is part of `FS` is set to errors. https://github.com/kripken/emscripten/blob/master/src/preamble.js#L2006-L2022 So the preamble is preprocessed and the output is prepended to thecompiled output of the C/C++ code. This must mean that at some point the prejs must be included into the preamble. Maybe it's part of `PREAMBLE_ADDITIONS`?

Ok so apparently `prejs` runs before Module is declared. This makes sense, since we can define our own Module object, and if Module were already defined, then our definition would override it. So yea, prejs already goes beyond it! And remember how JS does its binding, normally the this binding is lost within objects. So when adding a function to Module that returns FS. This FS appears loosely bound that's why it works. Yep this is because JS by default does not do lexical binding, instead it does dynamic binding. So this both works for variables in the closure and variables within the object. Of course this is now changed with the introduction of `let` and `const` var declarations.

Ok if prejs runs before Module is even created, this gives us a hook point before the module properties are event setup. However I do need to intercept where the Module is filled, but the FS is not yet initialised, if there's a hook point here, then I can use it and monkey patch in the usage of EVirtualFS.

So ok, I'm not sure where the prejs and the preamble is put together, but it does seem we have prejs first, then preamble. However something fills in what the global `FS` is, and that's through some sort of `--js-library` option, which brings in a JS library in addition to the core libraries in `src/library_*.js`. Which means the provision of JS libraries to the emscripten system is similar to linking in JS core libraries, this is not a module system, it's simply providing a JS object, that appears to exist globally within the Module context. I wonder how you would call into functions provided by an outside `--js-library` either in prejs or in Emscripten directly, perhaps it would use `EM_ASM` variants to call in these functions.

So `library_fs.js` has a number of functions that appear to be the init functions: `staticInit` and `init`.

The staticInit function is what mounts the MEMFS at root.

https://github.com/kripken/emscripten/blob/master/src/library_fs.js#L1382-L1405

So we can see that it first creates a nameTable which is an array of 4096. Then it does `FS.mount(MEMFS, {}, '/')`. Then it runs `FS.createDefaultDirectories()`, `FS.createDefaultDevices()`, and `FS.createSpecialDirectories()`. Finally it assigns all the possible filesystems depending on preprocessor flags.

The `init` function instead initialises apparently according to some sort of stdin, stdout and stderr. This is because the `Module` object can provide alternative instances of `input`, `output` and `error` streams. But that's because the `init` function is called with undefined parameters.

We can see what these defaults are:

https://github.com/kripken/emscripten/blob/master/src/library_fs.js#L1252-L1256 - creates directories of `/tmp`, `/home` and `/home/web_user`. This is specifically relevant to Emscripten and nobody else.

The mkdir calls then just perform `mknod`. The `mknod` then eventually calls `parent.node_ops.mknod`. So `parent` is infact a created parent node. It doesn't make sense why all of their adapters put in methods called `node_ops`. Perhaps they started with adaptation of the Node FS, but then stopped, or they are just using the "Node FS API". Meaning the resulting functions look like node functions but they aren't, but they decided to group these functions under `node_ops`. Errors are returned via `FS.ErrnoError`. So it doesn't appear to be catching exceptions and then returning them, instead it has various checks, and then returns an exception that's common across all the FS backends.

Who supplies the real implementation of `node_ops`. Well the strategies of `MEMFS` which is `src/library_memfs.js`, supplies these functions. So when a node is created, and the very first node is the root node, upon creation, the result is objects which has reference to the internal methods that create more of itself. So within MemFS, it creates a set of special `node_ops`, which are assigned to special inodes. OOOOHHH `node_ops` refer to the functions that work on an inode, not anything to do with NodeJS. LOL. Ok so it's basically structured in this way, where each inode has its own internal operations that can add new inodes as children to itself.

Apparently there is a `postamble.js` that does export the FS as well, so there's no need to add our own function to export the FS directly. That's pretty strange. Why is it not available, it's because of forced filesystem linking right?

Wait... could we delay the initialisation as well, so that we can pass in the correct FS instance before initialising the entire libgit2 module? Can require calls occur within JS dynamically? So the issue is that ES6 import will not work in this way, BUT require calls can be dynamic. Still the main issue is that importing shouldn't initialise the FS straight away, I want a way to override the internal FS backend.

Let's try this with the forced linking of FS operations. It relies on the `maybeExport` function which is defined in `modules.js`.

It relies on `EXPORTED_RUNTIME_METHODS`. Oh we use `EXTRA_EXPORTED_RUNTIME_METHODS` to do this.

There you go, you can get the FS module just by adding it to the `EXTRA_EXPORTED_RUNTIME_METHODS` whereever you see the `maybeExport` you can use it.

All the default runtime methods are utility functions that help with interop between C and JS usually to do with strings and the heap allocated chunks. Using CJS require you don't need modularize options. You should then also add force filesystem if you don't have it.

The default function to export is main, however if no main is defined, then this is not exported. There's also library deps and default library functions to export, but I don't think that's relevant except for the memory functions.

We have 2 defined hook points: `preRun` and `preInit`.

Firstly `preRun` exists in these locations in src:

```
memoryprofiler.js
preamble.js
emscripten-source-map.min.js
shell.js
library_fs.js
shell_minimal.html
postamble.js
shell.html
```

What is most interesting is the existence of `preRun` at `preamble.js`, `postamble.js` and `library_fs.js`.

Within the `preamble.js` there's the variables:

```
__ATPRERUN__ // functions called before the runtime is initialised
__ATINIT__ // functions called during startup
__ATMAIN__ // functions called when main() is to be run
__ATEXIT__ // functions called during shutdown
__ATPOSTRUN__ // functions called after the runtime has exited
```

I wonder how these correspond to the module properties. There's a function `addOnPostRun`. These are part of `maybeExport`. So these functions that add extra hooks are maybexported but are not documented. These are actually exported. But how are you supposed to run these when the initialisation is already done!?

There's also the setting `INVOKE_RUN` which says to run the main immediately, but I don't have a main so this shouldn't apply.

Wait it's the postamble that actually calls stuff like main!? Does that mean the FS is only initialised on postamble!?

So it appears that what ever that exists in `preRun` property is actually added to the `__ATPRERUN__` array by the `preRun` function. That is defined at `preamble.js`. So while there aren't properties on the module object for registering `preMain` and other pre functions, these can be used by the caller, since main can be not invoked. Wait... the `preMain` and functions like these are hoisted. Since `prejs` is literally prepended. This means at the prejs you can actually call these functions, and these will add callbacks into the above hook point arrays. Yea... that does make sense.

```js
function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
```

Who calls `preRun`? It's the `postamble.js` that's what calls `preRun()`, notice how inside the `preRun`, it eventually calls `callRuntimeCallbacks` which means that's where things are actually initialised. So if the `postamble.js` can be changed to not call the initialisation and delay it until a user provided init function, then that would be great!

Hah I can see a `postRun` hook also here but not documented. Weird how nothing is added to premain. Also weird how `preInit` is actually handled in postamble, not preamble, there really needs to be some refactoring here, it's all over the place!

Ok I got it now, the `run` function is the actual emscripten initilisation, and that's separate from the application defined `main`. It's like the main in assembly and the actual program load initialisation. `run` is defined at line 186 in postamble.js. It checks for args, and then runs the `preRun()`, then `preMain()`.

```js
function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }

}
Module['run'] = Module.run = run;
```

What we see here is that the `run` will check for module arguments, that appears to be set either by the module prejs or outside somewhere else. Then it will run `preRun()`. Then it defines a function that will be executed, and that's something then runs `ensureInitRuntime()`, then `preMain()`, then `onRuntimeInitialized()`, then calls main with args if it exists, then runs `postRun()`.


So who calls `run`? Especially since it's exposed to the `Module` object as well. The `shouldRunNow` refers to `main` not `run`. So changing that does not prevent running. Finally at line 339 to 343. Is where the `run()` gets called, and so the `postamble` always calls run!

So I can see it then. `preInit` is what gets called first. It does its job even before init. But that means none of the initialisation stuff is available. So this doesn't allow us to overrite the MEMFS implementation.

We can delay run, only by wrapping the whole thing with prejs and postjs as a function. Then when requiring the function is exported.

Looking at the finished thing. The main thing is:

1. Definition of the Module object. Which was prepending via prejs. Then the default definition of the Module if it doesn't exist, and if it does, adding in all the default methods.

Next is the `shell.js`.

So:

1. prejs (file prepend inclusion)
2. shell.js - sets up the defaults here! this is also how it determines how to export stuff
3. preamble.js
4. compiled output
5. postamble.js
6. postjs (file append inclusion)

In the `shell.js` there's a `moduleOverrides` it says that the Module object sometimes has properties that is meant to override the default module functionality. So these are collected into the `moduleOverrides`, such that after the default module properties are added, the conflicting elements override the builtin module properties.

The preprocessor that emscripten supports interpolation via `{{{ SOME_VARIABLE }}}`. So thing's like `{{{ PRE_RUN_ADDITIONS }}}` is actually meaningful. So these are also not documented lol. But it's also redundant because `preInit` is already going to be executed there. However the existence of this variable can be used from emcc and also to do weird macro stuff.

There's also another undocumented property `noFSInit` that is used within `library_fs.js` that basically means it adds a function to the `__ATINIT__`.  This is confusing. Basically `ensureInitRuntime` is what calls the functions in `__ATINIT__` while `preInit` has nothing to do with `__ATINIT__`. Then `ensureInitRuntime` is called by `run`.

So the JS code don't work as modules, instead they are just file-inclusion merged like C. It seems like it has it's own module system that uses a function called `mergeInto`. Basically it points to the `LibraryManager.library` and merges into another object and this object has a special property called `$FS__postset`, that calls `FS.staticInit()` and then adds a function that checks for `noFSInit` and then runs `FS.init()`. Note that `staticInit` is the one that mounts `MEMFS` onto the root. So this is not conditional on `noFSInit`. `noFSInit` is only relevant to std streams.

The mergeInto just copies the properties on the second parameter onto the first, so it allows you to add functions into the context where it can be called by the C/C++ within `EM_ASM` but also I guess functions that are in preamble and postamble. I'm not sure how it resolves the final object. Like in the `library_fs.js` it runs this as well but merges the `$FS` instead of `FS`. But then all the functions within it refer to `FS` instead. The `maybeExport` relies on eval since it actually generates JS syntax. As a string. This is why it's placed into `{{{ maybeExport('FS') }}}`. Woah there's a lot of metaprogramming here. And the reason it works here is because after joining together all the libraries via straight file read, it actually runs a preprocessor over them, and then runs eval on them. This is why I think then somehow `$FS` becomes `FS`.

How does `$FS__postSet` work? A `__postset` is a string that the compielr will emit directly into the output file. So basically properites defined in the libraries that are getting merged eventally become global hosted functions or properties. And the postset properties get interpolated directly into the resulting library and is executed. So in the case of `$FS__postset` the string just gets interpolated and the prefix `$FS` doesn't matter, it's just for labelling.

What determines the order of these `__postset` things? The docs say that keys starting with `$` are stripped. So yea, I think `$FS` is only for allowing other libraries to define dependencies. Using `__deps`. This whole thing is just so that they can have out-of-order library declarations and then have a resolver that finds out the right dependency order. Why didn't they just use an existing module system? Like requirejs or es6 modules? Well this was written before ES6 and you cannot use node like modules in something that is cross platform, so in the end the proper one to use should have been UMD. But I think now someone should refactor emscripten to use ES6 modules.

Ok so then postset must be used immediately as `library_fs.js`. This would result in an immediate static initialisation of the FS. Therefore if there was a way to inject code between the "import "of FS and the `$FS__postset`, then it could work to override the `MEMFS`. Alternatively since we found out about `moduleOverrides`, we could supply an alternative representation of the `FS` object. But now our `FS` would have to behave quite differently from the existing `FS`. Oh it appears moduleOverrides cannot override the `FS` because it already runs before the `{{ BODY }}`. The shell.js is what determines how to export things, in this case, it runs `module['exports'] = Module` if `module` is is not equal to undefined. So this is exactly like a nodejs cjs module that will have some initialisation occurring before exporting.

It is `modules.js` that exposes the `mergeInto` function and also merges all the designated libraries together. It is called by `compiler.js`. The `compiler.js` loads both modules.js and jsifier.js, the jsifier.js will bring in shell.js. The `jsifier` should be the one that deals with `postset`. Hold on if we create our own FS library in the form of `mergeInto`, we could use `STRICT` mode or make sure that FS is not linked directly, and instead link our own FS library into it?

It happens here:

```
    if (!NO_FILESYSTEM) {
      // Core filesystem libraries (always linked against, unless -s NO_FILESYSTEM=1 is specified)
      libraries = libraries.concat([
        'library_fs.js',
        'library_memfs.js',
        'library_tty.js',
      ]);

      // Additional filesystem libraries (in strict mode, link to these explicitly via -lxxx.js)
      if (!STRICT) {
        libraries = libraries.concat([
          'library_idbfs.js',
          'library_nodefs.js',
          'library_sockfs.js',
          'library_workerfs.js',
          'library_lz4.js',
        ]);
      }
    }
```

SO here, what we can do is switch on STRICT mode. (it is by default false). Also switch on `NO_FILESYSTEM`. We don't need any of those extra things. What we do need is to link in our own library. However this means that our own library will need to expose a delayed initialisation. And also support all the constructs of the main library. Wait, if we want libgit2 to be exposed in this way, we are just forcing virtual libgit2. The delayed is important so we can submit in a FS implementation and a FS instance at JS time, rather than at compile time. STRICT is not necessary but we don't need any of them EXCEPT `library_sockfs.js`. Although I don't know what `sockfs` has to do with websockets. When you enable strict, you will need `-lxxx.js` options like `-lsockfs.js` or `-ltty.js`. I don't know how these interact. I think sockfs is required for actual socket operations, it's the only thing supplying the `createSocket` function and this is used by `library_syscall.fs`. It relies on the FS because it uses indoes to store the socket structure. Verys strange, but again this relies on the `mount` capabilility of `FS`. `--js-library` We can use this: https://github.com/evanw/emscripten-library-generator Nah we can't do that. Ok I can see this, that `library_fs.js` depends on `$MEMFS` which is of course `library_memfs.js`. While memfs relies on `$FS` ok so that is a circular dependency, this should be ok.

Alternatively we can fork emscripten, change the staticInit of FS such that it doesn't do that until `init`. Or you fork it and change `library_memfs.js`... oh yea, you can just relink the `library_memfs.js` instead. So that's probably simpler... but we still need to allow instance passing as a parameter. That could be done inside memfs.

I THINK that's it, we use `NO_FILESYSTEM=1`, strict is left as is, and instead just force link `-lfs.js -ltty.js` and `--js-library our_own_memfs_library.js`. Hopefully that works. In this way, we don't actually need to export the FS anymore except for introspection. So the key idea is that the `memfs` library will allow a different backing store after deriving a certain property from `Module` or some global object that is passed in via prejs and postjs?

Remember what `NO_FILESYSTEM` prevents, you end up needing `-lfs.js -ltty.js` and that's it. See that using `__postSet` you're able to ask for `Module` and if there's a relevant property in it. The the prejs and postjs wrapper function, and export that. However note that by doing so it does do this weird thing with `nodejs` environment by also using `module["exports"]`, you might want to fix the environment somehow such that it's neither nodejs nor anything else. But still export it? Perhaps using ES6 modules? With ES6 you'd need to only support systems that have ES6. It's ok, cause rollup will deal with this. OK, that's the solution.

There are some extra functions to support:

```
allocate
mmap
msync
llseek
getattr
setattr
mknod
```

Note that `flock` would be provided by the emscripten `library.js` instead of the FS implementation... interesting.

Should also support the singleton representation of VirtualFS. For a singleton to work, it would have to represent a separate constructor of VirtualFS. Oh it's really easy.

We need to do a sanity test to see if this would really work.

```
emcc -O2 -Wall -Werror --bind --pre-js ./prejs.js -s "EXTRA_EXPORTED_RUNTIME_METHODS=['FS']" -s NO_FILESYSTEM=1 -s PRECISE_I64_MATH=1 -s PRECISE_F32=1 -s ASSERTIONS=2 lib.bc -o lib.js
```

When you run with `NO_FILESYSTEM` because it's not linked, there's no compilation error, however the FS is still supplied, but it's a simple stub, as it only results in errors. Ok this makes sense. And certainly provides a path to supplying your own FS implementation. These stubs are supplied by the `preamble.js`. However now if I provide linking abilities...

```
emcc -Wall -Werror --bind --js-library ./library_virtualfs.js ./lib.cc -o lib.bc

emcc -Wall -Werror --bind --js-library library_virtualfs.js --pre-js ./prejs.js --post-js ./postjs.js -s INCLUDE_FULL_LIBRARY=1 lib.bc -o lib.js
```

It doesn't work!!! The `-l` options don't do anything!? If I remove the `.js` suffix, it gives me back warnings, if I leave them in, I assume they have been found, so why did the FS errors still occur!?

There's also `SYSTEM_JS_LIBRARIES` setting as well?

I know why, it's cause `NO_FILESYSTEM` is used in more places than just where they are being linked. The usage of this `NO_FILESYSTEM` prevents the fs from being initialised. The preamble says that if `NO_FILESYSTEM` is set, it overwrites what the FS object is, to be instead an object of stub functions. Since the `preamble.js` is loaded after compiler.js and jsify.js and module.js, then I think it overwrites what the FS object is. There's alos other checks on `NO_FILESYSTEM`, so to main compatibility, we cannot use `NO_FILESYSTEM`.

Ok I know where it is now. It's part of the `preInit` function that's where you can get access teh `FS` object, while being able to monkey patch it before `run` is called.

Oh no, staticInit is at 6506.... no it won't work. Remember it's because of how `postSet` gets called interpolated and emitted directly. There's no hook point between the definition of the FS object (which is derived from the whole complicated module system), and its postSet commands which is just runnig staticInit. The only way we can deal with this is through overriding the linking part. Such that we link an alternative memfs into it that's based on VirtualFS. But we cannnot use `NO_FILESYSTEM`, and I'm not sure how the system reacts to 2 libraries the exporting the same things. In JS how does the merging of object keys work?

For every library which is in an array, it takes the filename out, this is the filepath I guess. Actually I just realised that `additionalLibraries` just come directly from the emcc compilation command. There's no usage of `--js-library` for `additionalLibraries`, what the hell!? Ok so modules.js is part of the compilation system. So it needs nodejs to run these things. Ok so we read in these files, preprocess them, process the resulting macros, and then run `eval` on the processed. Wait it seems that it should be possible to overwrite them!?

There we go, so `library.js` is the thing that means `LibraryManager.library`. It is what handles the resolution after `mergeInto` is evaluated. So all `mergeInto` does is put the `$MEMFS` property into `LibraryManager.library` object. This means `library.js` is also getting evaluated at compile time. No that's not it. It's definitely still in `modules.js` and `compiler.js`.

Ok `--js-library` does work, it just gets eliminated for some reason, most likely because it's not being used. You have to use like `INCLUDE_FULL_LIBRARY` to make sure that gets used.

HOLYSHIT IT WORKS. It works because additional libraries loaded afterwards wipes the previous setup of MEMFS. And there we go, we have overridden memfs definition using `--js-library`.

Ok so what we need to do is create a memfs library wrapper around virtualfs, supply it into this. However this specific one needs to be done dynamically right? So it's not just using a new virtualfs, but being passed in from the outside.

ALTERNATIVELY we could represent virtualfs as singleton, so each creation of virtualfs represents the same virtualfs. This may make certain integrations more easier. And then we would have a single virtualfs to deal with.

However, this may not work when say dealing with multiple key nodes, and each keynode has many key repositories each which is independently encrypted. But again, that's not really a problem, since we can use subdirectories for this purpose.

We can also overwrite and change to a different shell.js so we can export it the way we want?

```
import LibGit from 'lib.js'
let git = LibGit(new EVirtualFS());
```

The construction of libgit requires passing in the necessary git system. So the idea is to expose VirtualFS to emscripten, through a js-library. But the fact that we need to pass it in, indicates the necessary VFS instance. Note that as it is a function that represents a `vfs`.

```
emcc -Wall -Werror --bind --pre-js ./pre.js --post-js ./post.js --js-library ./library_virtualfs.js ./lib.bc -o ./lib.js
```

So that means the virtualfs wrapper only exists here and we just integrate it here? Or should we bring in the `library_virtualfs.js` wrapper from the virtualfs repository? But the problem is that we need to export the actual file, not just module. That is the result must be an actual file that we can pass at the command line.

One way to do it is to use the vfs instance to expose the memfs.

The way `EXPORT_NAME` is supposed to be used is like `-s EXPORT_NAME="'Something'"`. Without the internal quotes, it won't work and will result in a compilation error. So apparently if you combine this with `MODULARIZE`, Emscripten will already place the whole thing into a function. However it still doesn't do ES6 modules properly, instead it's just a global function. It doesn't affect the CJS export, since it still going to use `Module`, it just assigns it also to the `EXPORT_NAME` object as well. So if you do this, then you need to change the initial `Module` variable. Furthermore, this name can then be used to create a `library_virtualfs.js` that knows where to get the right properties. Wait, that doesn't really matter, since you can always access `Module` and that gets aliases to whatever `EXPORT_NAME` to be. The main thing is that I want to be able to access a runtime parameter on the `Module` object that represents the implementation for the MEMFS. The way to do this is to proxy all of the functions to the parameter properties. We don't need to use `EXPORT_NAME` nor `MODULARIZE=1` until this is done: https://github.com/kripken/emscripten/pull/5569#issuecomment-328752028

---

```
      // node is created from FS.FSNode
      // which is passed parent, name, mode, rdev
      // how to use VirtualFS inode?
      // then FS.hashAddNode(node)
      // FSNode is a function that constructs an object that...
      // contains properties
      // parent
      // mount
      // id
      // name
      // mode
      // node_ops
      // stream_ops
      // rdev
      // the prototype is another object that has
      // read
      // write
      // isFolder
      // isDevice
      // the above are functions that also have get and set
      // actually they are just properties that have special overloaded get and set functions
      // ok so...
      // the main idea is that we want to create inodes directly in vfs
      // but how to do this?

      // it does add the node to a hash table
      // well name table
      // that says that its hash is a hashName(node.parent.id, node.name)
      // hashName appears to take the parent id and the name of the inode together to return a special number
      // basically creating a hashtable
      // instead of using a normal object
      // even though they still use a normal object
      // wtf?

      // so the memfs seems weirdly intertwined with the `library_fs`
      // that's one of the problems here
      // where library_fs then represents the state with root tree objects

      // we can access inode capabilites by using
      // vfs._inodeMgr.createINode
      // this gives us back an inode object
      // that we can try to decorate with our own properties
      // but the problem is that the actual state of the vfs is actually in
      // library_fs...
      // WTF

      // ok so I realised that library_memfs is not even the only memory representation
      // it just supplies relevant memory ops
      // the library_fs is what actually stores the state
      // so we if we abstract it at the level of library_fs
      // then we only result in a problem where the state will be duplicated
      // once inside vfs, and once inside the FS.root, FS.mounts, FS.nameTable
      // see nameTable acts like an Array
      // right they didn't use an object, they created their own hashtable here
      // lol...

      // it also appears to use `contents`
      // that act like an array as well or an object not sure
      // definitely object
      // basically the usage of directories have a contents property
      // that represents an object linking into the subsequent
      // path

      // the main key point is that by supplying your own virtualfs
      // you'll need to maintain the state in FS without calling FS functions
      // that means monkey patching its code too
      // like FS.hashAddNode(name)
      // where name is `'/'`

      // usages of FS inside MEMFS:
      // FS.createNode -> FS.hashAddNode
      // FS.isFile
      // FS.isDir
      // FS.isLink
      // FS.lookupNode -> uses FS.hashAddNode and the hashTable
      // FS.genericErrors
      // FS.ErrnoError

      // there we go, the only thing we need to do is adapt into the hashAddNode
      // in fact that should just work then

      // the 2 uses of lookupNode occur in rename and rmdir
      // so only these 2 map into lookupNode
      // whereas the normal fs will try to read things itself

      // there are multiple lookup implementations
      // FS.lookupNode -> parent node and name returns the node
      // FS.lookupPath -> path and options -> calls lookupNode at some point
      // FS.lookup -> parent node and name returns...?

      // OH i get it
      // see lookupNode tries to use the nameTable inside FS
      // but if it doesn't exist in nameTable which it considers a "cache"
      // it tries to find it in the vfs
      // meaning memfs or whatever rootfs implementation
      // it goes through the node_ops.lookup
      // the normal memfs uses lookup to just point to an error
      // in our case, we're going to proxy that into vfs
      // this means we don't need to call FS.createNode
      // ok while that solves inode issues


      // what about file descriptors
      // it has a FS.streams array
      // containing an array of fds
      // then getStream functions acquires streams there
      // that means we leave streams to the library_fs
      // so memfs doesn't deal with it

      // library_fs also maintains cwd for the internal emscripten module
      // this is OK, think of it as a separate thread in a way

      // what else is there?
      // memory map
      // this uses `_malloc`
      // which is a call into the emscripten system that produces the length
      // and returns a pointer into the heap array
      // then the buffer is set with buffer.set(contents, ptr)
      // this is not a nodejs buffer, what is it?

      // the idea with a memory map is to take a file
      // and map its contents into memory
      // a similar thing can be done using our system as well
      // it also assumes a stream, so it must be using a file descriptor for this
```

Ok I got the idea now, we only need to make sure not to use the FS name table when representing our files.

I don't think we should be generating minified code for our system. The minification can take place later, however the usage of dead code elimination should still be applied. While optimisations can be done on the C -> Bitcode stage, the Bitcode to JS should only do dead code elimination not minification.

---

Just to recap. First we compile libgit2 into llvm bitcode. This is done via emcmake. Which first runs cmake to produce the necessary build files, and then the build files are executed. This produces a libgit2.bc code. It is not yet turned into JS. This is fine, because we intend to statically link into it and wrap the code with JS functions. The next step is to have a C wrapper that loads the header of the libgit2, and we compile this as well into the wrapper bitcode. This is because we can only expose C functions to JS if it is explicitly setup, there's no automatic detection of what functions we intend to use. So we use the emscripten C++ bind system to bind to functions there, all we need to do is write function headers apparently and some macros in this file, and all the capabilities will be exposed.

Finally we have the JS and the bitcode and we put the together. This involves using the 2 previous outputted bitcode along with a monkeypatched MEMFS module that is done by using the `--js-library` option to embed our own virtualfs module into it. This involves assuming a global fs parameter is available to our virtualfs adapter, and then the whole thing is wrapped in prejs and postjs that turns our thing into a module. Of course we make sure to  also export the FS object, which is not our own FS, but the emscripten Fs object, we don't replace the entire FS object, we only replace the memfs system, that the FS object performs.

Assuming it all works, the output is a JS file that acts like a CJS module. Although our wrapper can make it act like a ES6 module instead, if so, we'll have to use babel to turn it into a normal CJS module, while also exposing the ES6 module for usage. It doesn't really matter, since there's nothing to rollup, since we don't import anything anyway. As in there are no "npm dependencies here". Well except unless we use a buffer implementation anyway. Not really, why would we pass in a Buffer!?

I guess I wonder if we really need the Buffer module when we can also just make sure that createINode when there's no data, we'll just create our own empty Buffer. Note that VFS package exposes this already. It exposes the Buffer system that it uses.

One aspect is that the name of the virtualFs object will need to be macroized, so that it can be known what needs to be set in the prejs.

On the otherhand, we'll just preset it right now to `virtualFs`.

---

```

      // default directories gets created like
      // /tmp
      // /home
      // /home/web_user
      // what happens if those directories are already created!?

      // createDefaultDirectories uses mkdir
      // to create /tmp, /home, /home/web_user
      // the mkdir is also in library_fs.js
      // it calls FS.mknod
      // so what happens if the directory is created
      // mknod calls lookupPath
      // the FS.mayCreate(parent, name)
      // if err the throws new error
      // if the node ops doesn't have mknod
      // then there's an EPERM
      // then it will call parent.node_ops.mknod
      // so we are assuming that these directories don't exist
      // we cannot use the normal

      // so we already have this in vfs, but it appears we cannot actually use those
      // then there's the createDefaultDevices
      // which creates /dev/null
      // and /dev/tty
      // and more
      // we don't have that, so that's left to emscripten to handle
      // it would make sense in the future that emscripten integrates virtualfs and instead uses its device interface to implement things like tty
      // also things like /dev/shm
      // and /dev/shm/tmp

      // also special directories is interesting, as it would rely instead on mounting special directories
      // so virtualfs would need mounting capabilities, to add special filesystems like /proc and /sys
```

---

Inside library_fs.js.

We have a mount function. This function takes a type, opts and mountpoint. The MEMFS is what gets mounted first. This happens inside staticInit. This function is important, as we need to see what it expects.

```
FS.mount(MEMFS, {}, '/');
```

Note that MEMFS is the entire object defined inside `library_memfs.js` or soon `library_virtualfs.js`.

```
  var root = mountpoint === '/'; // true for MEMFS
  var pseudo = !mountpoint; // false due to '/'
  var node;

  // if root is true, and we already have a root
  // this is what prevents mounting things into root!
  if (root && FS.root) {
    throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  } else if (!root && !pseudo) {
    // if not root, this is not relevant, as we are not mounting anything other than root
  }

  var mount = {
    type, opts, mountpoint, mounts
  }

  var mountRoot = type.mount(mount);
  // in memfs, this mount object is discarded, and is not used
  // we simply don't care to mount memfs within memfs
  // so it's discarded

  // so the node has a property which is mount, and this is assigned to the mount object above
  mountRoot.mount = mount;
  mount.root = mountRoot;
  // mount's root prop is assigned to mountRoot, here we get a circular object


  if (root) {
    FS.root = mountRoot; // the root object is assigned to created root node from memfs
  } else if (node) {
    // not relevant because we are only mounting root
  }

  return mountRoot // so here we just return the root node

```

What does createNode in `library_fs` do?

```

  if (!FS.FSNode) {
    FS.FSNode = ... // this is the constructor for a inode
    // it represents an object that has a parent, mount, mounted, id (inode id)
    // and name, mode and node_ops and stream_ops
    // and rdev
    // it alos has an empty prototype
    // but then it is assigned with special functions that is
    // read, write, isFolder, isDevice
    // similar to the stat object that we have
    // after assigning this constructor, we then run this
    // and we pass it into hashAddNode(node)
    // so there's a hashtable that maintains the list of inodes just like our iNodeMgr
    // so we need to replace that instead
  }

```

The createNode within `library_fs.js` runs hashAddNode, which does this:

```
  var hash = FS.hashName(node.parent.id, node.name)
  node.name_next = FS.nameTable[hash]
  FS.nameTable[hash] = node
```

So we get a hash, produced from the node's parent node, and the node name, and this hash is stuck into the `nameTable` which points to the node. While also `name_next` property is equal to where `FS.nameTable[hash]` is dervied, but if hash has never been assigned into `nameTable`. What does this give us? Isn't that weird?! HashName appears to be some sort of algorithm for hashtable production, so it takes this:

```
  var hash = 0;
  for (var = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return ((parentid + hash) >>> 0) % FS.nameTable.length.
```

Where `hash`.

Yea this is some sort of cache for all the nodes, just basically the same as using ES6 Map basically.

Removing the node doesn't remove based on hash. Instead the hash is calculated again from the node itself. Then if the nameTable[hash] === node, oooo. Ok so the original value inside this nameTable appears to represent some sort of default value that has to be reset into it. It's an Array[4096]. Asking about what something is without first assigning it just returns undefined, so I guess it's just a weird way of assigning undefined to array values. Kind of weird isn't it. OOOOH I know, it's a way of handling conflicts, it's basically linked list style conflicts of the hash table. Still I think maybe I should replace the entire library_fs.js instead of dealing with this. But we'll need to handle alot of special cases.

---

```
root
mounts
devices
streams - array of fds
nextInode
nameTable
currentPath
initialized
ignorePermissions
trackingDelegate
tracking
ErrnoError
genericErrors
filesystems
syncFSRequests
handleFSError
lookupPath
getPath
hashName - appears to only be used privately
hashAddNode
hashRemoveNode
lookupNode - used by library_syscall.js
createNode - creates an inode, just like how we do it with inodeMgr (but we do it explicitly via different construction methods, this is just the general method to how to construct it), used by sockfs, proxyfs, nodefs, lz4...
destroyNode
isRoot
isMountpoint
isFile
isDir
isLink
isChrdev
isBlkdev
isFIFO
isSocket

PERMISSION STUFF:

flagModes - only used within library_fs.js
modeStringToFlags - used by sockfs
flagsToPermissionString
nodePermissions
mayLookup
mayCreate
mayDelete
mayOpen

FD (stream implementation apparently)

MAX_OPEN_FDS: 4096 (why do we even bother with this)
nextFd
getStream
createStream
closeStream

DEVICES
chrdev_stream_ops
major
minor
makedev
registerDevice
getDevice

CORE
getMounts
syncfs - foreach mount, it runs the mount.type.syncfs (which we just don't bother with)
mount - does it for the root node, needs to exist, and we use this for actually initialising the VFS with the root node, in our case, calls to this just should launch an error
umount - same launch an error
lookup
mknod
create
mkdir
mkdirTree
mkdev
symlink
rename
rmdir
readdir
unlink
readlink
stat
lstat
chmod
lchmod
chown
lchown
fchown
truncate
ftruncate
utime
open
close
llseek
read
write
allocate - what is this!? This is fallocate call (we don't have this in VFS atm, but it's used by syscall 324) for things that perform fallocate, ok we need a fallocate call in our VFS
mmap - this is for memory mapping a file, very simple for us, we just get the buffer of the file
munmap - nothing!?
ioctl - Some streams support ioctls? I suppose for things like tty and stuff.
readFile
writeFile
cwd
chdir
createDefaultDirectories - this should not be needed in our case, since we'll assume it's already created
createDefaultDevices - this is more complicated, as we need to do things like TTY.register
createSpecialDirectories
createStandardStreams
ensureErrnoError
staticInit
quit

V1 compatibility functions
getMode
joinPath
absolutePath
standardizePath
analyzePath
createFolder
createPath
createDataFile
createDevice
createLink
forceLoadFile
createLazyFile
createPreloadedFile
// ALL OF THIS ABOVE FUNCTIONS DO NOT NEED TO BE IMPLEMENTED

PERSISTENCE
indexedDB
DB_NAME
DB_VERSION
DB_STORE_NAME
saveFilesToDB
loadFilesFromDB
//ALL OF THIS ABOVE DO NOT NEED TO BE IMPLEMENTED
// we don't really need this.
// so the only ones needed are to line 1400
```

We have to assume all is public to be able to replace the library_fs.js

And because of the way this thing is structured, the only way to make these functions work is by having them public. We'll have to search for parts that are not used by other libraries.

Also this assumes mounting, but we also could just eliminate mounting as an option altogether.

Some of those functions are intended to work on just modes. But really we should be punting them into the stat system. That is we just use the constants as defined in JS. The class requires it object to be created and then does things like that, I suppose somethings will need to be used again. Sucks!

It's mentioned that the FD public API is in the Advanced Fielsystem API. It appears that nextFd is used to actaully get them a fd number, then that's used for the purpose of creating fds, I have a better way to do this using our js-resource-counter. Of course this whole thing is a bit stupid, especially with the way libraries are constructed.

Also how do we propropagate errors? We'll need to wrap all VFS errors into the FS.ErrnoError system instead.

There's an assumption that these calls are all asynchronous right? No it is expected to be a synchronous interface, because that's what posix C programs expect.

What about things like /proc/self/fd, the way that library_fs.js deals with this is hijacking the lookup function for the inode of /proc/self/fd, such that finding things leads to finding one of the possible file descriptors. It does `var fd = +name;`, which turns the name into a file descriptor number, and we lookup that number. How do we manage that!? In the linux system, the /proc filesystem is a special system mounted onto it, it has special features, but the main point that is that inside /proc/self/fd, each is a symlink to some other thing like /dev/pts/0, and sometimes they are just socket inodes instead. It is not a normal filesystem.

Ok so the only tough things to figure out is the proc system and the tty devices, everything else can be replaced with VirtualFS. The idea is to remove MEMFS and remove the concepts of mounting. I don't think sockfs matters, so we're not going to try to implement mounting in that way.

Do we need ignorePermissions, I don't think so, this is because we are starting as root, and we don't change the uid. In terms of ignoring permissions, the system seems to use this in order to know whether it can just call some call to create or change thing sin the FS.

Does that make sense in our system? Root can always do everything so all permissions are ignored while in root anyway. Wait so the idea is that the user is the `web_user`. And it's home is `/home/web_user`, and this is where the permissions matter, since the idea is that the web user will have a specific id that will be used. That's why we need to ignore permissions for the moment, and that the creation of things would have an owner right? Owner is always 0 and 0. It's always root here. What we can do is make ignorePermissions mean that root is currently set to the user, and then change users. Or it doesn't matter, the uid and gid is always root, and and that the current user is always web_user, but that's just its name really. The root user could have a home, so it's fine.

We also don't need multiple inflight sync requests, they are noops anyway.

The main idea is that calls still result in things like node operations. Wait the stream nodes are still used in a way, that, there exists a concept call the stream object, and that this is delivered to the end user in order to do things. Oooohh, this is going to be difficult!

For the proc self fd issue, this can be done by overloading the directory inode and still using it there. That would allow us to just display all of the streams directly via the readdir or the contents of the directory, that's simple.

For the TTY services, this may require building a device interface and registering it, although I'm not sure if this is how it works. For the rest, this may requires wrapping up the objects returned to the system to match the same interface.

Let's investigate how the TTY system works.

```js
TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
FS.mkdev('/dev/tty', FS.makedev(5, 0));
FS.mkdev('/dev/tty1', FS.makedev(6, 0));
```

So the function `makedev` just returns the number combination. It represents the major and minor joined together, so `/dev/tty` and `/dev/tty1` are on different major devices. On linux I instead have `5,0` and `4,1` for tty and tty1 respectively. Both are character special files. With tty with 0o666 and tty1 iwth 0o620. So /dev/tty is actually outputting to the stdout of the terminal. It represents the controlling terminal for the current process. So does every process have a controlling terminal? What happens if it is ran under X or some other system!? Oh not every process has a controlling terminal, so it may not exist for a given process.

```
# these are symlinks
/dev/stdin -> /proc/self/fd/0
/dev/stdout ->  /proc/self/fd/1
/dev/stderr -> /proc/self/fd/2
```

The `/dev/tty` is not a symlink, but it does represent the same tty as when you run `tty` whixh reports things like `/dev/pts/1`. Also owned by the gid 3 that is tty.

The manual does state that `/dev/tty` is a character device 5 0 with mode 0o666 and owned by the group tty, we don't have a group tty so I don't think it matters. It's a "synonym", so that's probably some legacy thing since it's not a symlink. It supports ioctl calls. Does emscripten point this into the JS console, that is it's tty is the actual JS console!?

The emscripten on create standard streams does this:

```
FS.symlink('/dev/tty', '/dev/stdin');
FS.symlink('/dev/tty', '/dev/stdout');
FS.symlink('/dev/tty1', '/dev/stdout');
```

Notice that what happens is that stdin and stdout are actually linked to /dev/tty so that reading and writing comes from the controlling terminal. But stderr goes to the other tty1.

However this only happens if stdin and stdout and stderr are not overridden in the Module object, which you can override and point the stdin and stdout and stderr to somewhere else. In that case, it instead usese `FS.createDevice`.

```
FS.createDevice('/dev', 'stdin', Module['stdin'])
FS.createDevice('/dev', 'stdout', null, Module['stdout'])
FS.createDevice('/dev', 'stderr', null, Module['stderr'])
```

The createDevice function is a v1 compatibility function that that registers a device using the given functions, notice that it takes a directory, the name of the element within that directory, then an input function and an output function. The registration of the device is done via an object that has open, close, read, and write. And returns with the `mkdev` call.

```
makedev -> Just get the device major and minor combo
createDevice -> Create a device with specified input and output functions, and register it with an object interface matching a device operations
mkdev -> runs mknod so it creates the actual device on the filesystem instead of just registering it
registerDevive -> Assign into the FS.devices array with an object containing stream operations
```

According to emscripten, the stdin is by default reading from the temrinal in the command line or using window.prompt in browsers, in both cases with line buffering, while stdout is using print where defined with line buffering and stderr with the same output function as stdout. Is this is what /dev/tty also defined with!?

The `FS.init` function comes with input, output and error parameters that represent callbacks that are called. So input callback are called with no parameters when the program attempts to read from stdin, it should return an ascii character code when data is avaialbe or null when it isn't. Oh so these are just triggering callbacks. These are callbacks to trigger input or output, not exactly done for actual reading or writing things, since you don't have access to the data. So window.prompt() will always give back a newline or something!? Note that console.log always adds a newline to the end of the string. Compare with things like `process.stdout.write` which writes without a newline. Wait this doesn't make sense, the `init` would assign the passed input and output and error callbacks into `Module['stdin']` or whatever, and only assign existing `Module['stdin']` if it wasn't passed back, this means these things are getting assigned unless these were first undefined, and so they would be created as devices then these callbacks!?

There are other terminals, but not assigned to programs. Now also I have `/dev/pts`, these are assigned to pseudo terminals, that is Konsole running inside the X Virtual Console. So they are placed inside `/dev/pts`, but this convention rather than any technology constraint or standard.

Processes that don't have a controlling terminal is not subject to receiving job control related signals from terminal events. These processes would then not have access to `/dev/tty`. So this only really makes sense for single process systems, if we have always `/dev/tty`, otherwise we'd need to create mounting functionality and create a custom FS just for dev. So you cannot get SIGINT, unless another process explicitly sent it with the kill syscall.

If a process that is not a session leader opens a terminal file or that `O_NOCTTY` options is used, then that terminal shall not become the controlling terminal of the calling process. When a controlling terminal becomes associated with a session, its foreground process group shall be set to the process group of the session leader.

The controlling terminal is inherited by child processes during the fork call. A process relinquishes its controlling terminal when it creates a new session with the setsid function, other processes remaining in the old session continue to have it. Upon the close of the last fd in the system, whether not it is int he current session.

A process does not relinquish its controlling terminal simply by closing all of its file descriptors associated with the controlling terminal if other processes continue to have it open.

When a controlling process terminates, the controlling terminal is dissociated from the current session, allowing it to be acquired by a new session leader. Subsequent access to the terminal by other processes in the earlier session may be denied, with attempts to access the terminal treated as if a modem disconnect had been sensed.

Ok so why does emscripten use /dev/tty1 as its stderr, when /dev/tty appears to support the ability to do stderr (but I'm not sure how this works atm). Also there's no `/dev/tty0` atm.

In JS we assume only 1 program, so only 1 terminal should be neccessary with its stdin and stdout relegated to things like console.log and console input. If you do `ll /proc/self/fd` it shows that 0, 1 and 2 are all symlinks to the same terminal device that is: `/dev/pts/4`. So the same terminal handles all the std streams, but how does the device know whether it's intended for stdout or stdin and stderr? Well it's easy, remember that the device is special, it can remember all the streams opned on it, so we can say that the first stream opened is always stdin, and the second is always stdout and the third is always stderr, and then prevent any other descriptors opened on the terminal. Or all subsequent ones are relegated to be stdout streams. Wait but we also know that some fds are read/write, so I guess both are relegated to stdin and stdout. Or perhaps there's another way to open the terminal device and specify that it should be the stderr.

http://devosoft.org/an-introduction-to-web-development-with-emscripten/

https://kripken.github.io/emscripten-site/docs/api_reference/advanced-apis.html

https://stackoverflow.com/questions/14063046/fallocate-vs-posix-fallocate

http://kapadia.github.io/emscripten/2013/09/13/emscripten-pointers-and-pointers.html

https://github.com/Planeshifter/emscripten-examples/tree/master/01_PassingArrays

---

And mmap and munmap and ioctl, and maybe dup calls as well.

We're replacing the whole system with our own library_fs.js, we'll need to have the equivalent in semantics for a number of the functions.

So mmap uses the HEAPU8, which is the total memory set that being used by emscripten. So the idea is to map a file data into a section of memory into that area, such that mutations that area in HEAPU8 will directly map to changes within the file. How is this achieved?

Here is how it is used:

```
var info = FS.getStream(fd); // a stream object
if (!info) return -ERRNO_CODES.EBADF;
var res = FS.mmap(info, HEAPU8, addr, len, off, prot, flags);
ptr = res.ptr;
allocated = res.allocated;
SYSCALLS.mappings[ptr] = {
  malloc: ptr,
  len: len,
  allocated: allocated,
  fd: fd,
  flags: flags;
};
return ptr;
```

That is in `library_syscalls.js`, what this seems to show is that a fd is already passed in, then an area within memory is passed in, and also things like, addr into that HEAPU8, and length, prototocl and flags.

The official mmap call is `pa = mmap(addr, len, prot, flags, fildes, off)`.

What does it actually do!? The HEAPU8 is the process address space and in C, that's implicit it appears?

pa is the address of the mmaped data. So whatever pa is the pointer into the process memory.

From pa to len, will be a legitimate address space mapped from the file. The range of bytes starting at off and continuing for len bytes, will be legimiate for the possible offsets in the file or shared memory object represented by the fildes.

The mapping established replaces any previous mapping for those whole pages containing any part of the address space of the process starting at pa and continuing for len bytes. How do mismatched offsets work here?

If the size of the mapped file changes after the call to mmap, as a result of some other operation on the mapped file, the effect of references to portions of the mapped region that correspond to added or removed portions of the file is unspecified.

The mmap is supported for regular files and shared memory objects.

The parameter prot determines whether read, write or execute or combination of it is permitted on the data being mapped. The pro should either be `PROT_NONE` or the bitwise inclusive OR of one or more of the flags. What does it mean to be able to execute the data? Is it to jump into some area inmemory and execute the code there? That would mean mapping into an execute machine code, but that doesn't make sense, since what about the linker and everythign!? Regardless of these prot options, the fildes will always need a read capability, since you need to read the data into memory. There's also options which contain shared, private or fixed. If you specify shared, prot write doesn't require a write permission.

If shared is specified, writes change the underlying object. If private is specified, modifications to the mapped data is  only visible to the calling process and is not reflected onto the file. It is unspecified whether modifications to the underlying object done after map private is visible through the map private mapping. The mapping is retained across forks.

If map fixed, then the value of pa must be addr exactly. If map fixed, mmap may return map failed and set errno to EINVAL. If fixed is not specified, the addr is in used in some way to arrive at the returned pointer pa. The implementation figures out where to set the pa. An addr valueo f 0 means the implementation can choose anywhere. A non-zero value is taken to be a suggestion. So without setting it, then pa is never set to 0, nor does it ever conflict with any other mapping. Off argument has to be aligned according to the sysconf pagesize. mmap adds extra references to the file associated with the fildes, which is not removed by close on the fd, this reference is only removed when there are no more mappings to the file. Atime is updated. Ctime and mtime for shared and prot write will be marked for update at some point between a referenced write and the next call to msync. Without msync, the sync takes place at the discretion of the implementation.

Does it make sense to eve nuse shared here? I guess you can map the changes back into disk.

Library memfs checks that if the flag IS NOT `MAP_PRIVATE` and that the contents of the inode is === to the buffer or buffer.buffer, then allocated = false and ptr = contents.byteOffset. So actually in fact, that `MAP_PRIVATE` is supported, and what we get is new piece of memory equal to the duplication of the previous buffer, like `Buffer.from(buffer)`. Except that it uses a raw typed array instead of Node buffers. So yes, private mapping is easy, it's just really give you back a buffer. The problem is that this is heap dependent, vfs has no concept of a global heap address space, this is emscripten. So emscripten fs wrapper will need to supply this concept. There's a comment that says that they cannot emulate `MAP_SHARED` because the file is not backed by the buffer. What does that mean?

So HEAPU8 is a uint8array. And the mmap call relies on this as the total set of memory to map into.

This is because in JS, we don't get direct access to the memory details.

It's also true we cannot create a contiguous view into non-contiguous memory maps. So we cannot just take it, and expect it to work. The kernel actually has a page based data structure that maintains a mapping from virtual pages to physical memory, and thus can periodically choose to synchronise dirty pages to the physical disk. However we cannot do this with just a uint8array, since this is just a plain view into an arraybuffer that is immutable, and there is no page based data structure embedded into it that we can hook into. Instead emscripten must use some sort of external data structure to maintain mappings, and that's why it may not make sense to expose a mmap call on the vfs, as we cannot do it exactly, unless the API can be left to the implementation to implement, basically there is no automatic synchronisation that can occur, instead mmap syscall is meant to return a pointer to where the mapped memory starts, and that's it. Now it's up to whoever calls to maintain that synchronisation.

For now I need to check how emscripten does this.

This is what library memfs does:

```
function mmap (stream, offset, length, position, prot, flags) {

  var ptr;
  var allocated;
  var contents = stream.node.contents;

  // is contents intended to be a uint8array as well
  // are we say that he contents of the file are in the same heap buffer
  // and that the uint8array is just a view/slice into an existing array buffer?

  // this is now impossible in VFS, as the fs files are never stored in the HEAPU8 global buffer
  // because of this, when mmap of MAP_SHARED is used, it's irrelevant
  // because the contents of the file is stored in the same HEAPU8 buffer
  // this means allocated = false
  // and the returned pa address or ptry in this case is the just the byteOffset of the file content
  // which points back into the HEAPU8
  // that it is an index back into HEAPU8
  // the byteOffset of the contents is the pointer into HEAPU8 where the file
  // exists
  // this means with MAP_SHARED if the contents.buffer is in the same buffer
  // then there is no need of synchronisation of memory pages
  // IT IS THE SAME MEMORY!
  if (!(flags & MAP_PRIVATE) && (contents.buffer === HEAPU8.buffer)) {
    allocated = false;
    ptr = contents.byteOffset;
  } else {

    // this means either it is MAP_PRIVATE
    // or that it is MAP_SHARED
    // but with the contents.buffer somewhere else
    // note that this means that NODE_FS doesn't support this
    // remember mmap is supplied on the stream_ops
    // so other impls can override and supply their own implementation of mmap

    if (position > 0 || position + length < stream.node.usedBytes) {

      // this is just slicing stuff
      // and placing it into the contents array
      if (contents.subarray) {
        contents = contents.subarray(position, position + length);
      } else {
        contents = Array.prototype.slice.call(contents, position, position + length);
      }

      // see how it reassigns the memory into the HEAPU8
      // and it gets that exact length
      allocated = true;
      ptr = _malloc(length);
      if (!ptr) {
        throw new ENOMEM;
      }
      HEAPU8.set(contents, ptr);

    }

  }


}
```

They are removing the buffer argument, since it's a global and it's always the same.

A uint8array can be a view into an existing buffer. That it is possible to do this:

```
new Uint8Array(arraybuffer, byteOffset, length);
```

As you can see it's possible to create a uint8array (a view) into a subsection of an array buffer. So then it is possible to ask whether the content or unint8array's buffer the same as the global HEAPU8 buffer, which is a view into the entire buffer totally.

Node's underlying buffer implementation is also an ArrayBuffer. IF you use `Buffer.from('abc').buffer`, it gives you the ArrayBuffer. So that's pretty cool. It means it's simple to convert from Buffer to ArrayBuffer. This also means it's possible to convert a typed array to a node buffer simply by converting its underlying buffer.

```
buf = Buffer.from(array.buffer);
buf = buf.slice(array.byteOffset, array.byteOffset + array.byteLength)
```

Note how that the array may be a view into a larger buffer. Doing this avoids needing to do anything else. And since Buffers also contain ArrayBuffers, it all just works. How funny.
Oh shit we don't need that extra dependency, it's possible to just do it directly from the buffer itself. Note that ArrayBuffer can't be converted directly into Buffer without first doing the Buffer creation.

That means we that memfs's files are stored in the same HEAPU8, that's why they are checking if the underlying buffer is the same buffer. Now with VFS, this is impossible, since our content is stored in independent buffers, not as part of the HEAPU8. (Not sure why this was done in the first place.).

If the stream ops doesn't have the mmap call, then library_fs.js just returns ENODEV. This is what happens when nodefs is used.

What this means is that Emscripten is not emulating `MAP_SHARED` when the file contents is not actually backed by the same HEAPU8. It only emulates `MAP_SHARED` when the file contents is on the same HEAPU8. But that's ok, becuase that's how `memfs` works, it puts all of its file contents into the same HEAPU8.

So if it isn't or that `MAP_PRIVATE` is selected, then it just creates a new section of memory inside `HEAPU8` by using `_malloc`. And copying a slice of that file contents buffer into there.

So there isn't any kind of dirty paging system being used by the emscripten, it just isn't supported, or it is, because it's same memory. Also the msync in librarymemfs is actually redundant, because if it's hitting memfs, that would mean that the memory is the same anyway, so there's no need to actually perform a write to the file descriptor.

It's also true that the offset into HEAPU8 is ignored, just like for mmap that the addr is usually supposed to just be 0, and that it allows the implementation to find where to store things.

The length of memory mmapped is still relevant, cause that tells us how much of the memory to actually create or allocate if it is shared. Note that for the traditional mmap call.

The official mmap call is `pa = mmap(addr, len, prot, flags, fildes, off)`.

```
EMSCRIPTEN <> POSIX
offset        addr - suggested location to use for mmap
length        len  - length of the mapped bytes (should be pagesize)
position      off  - offset into the file to start mapping from
prot          prot
flags         flags
```

So the position of the parameters is different.

Ok since we are replacing library_fs itself, we have the free reign to consider HEAPU8 as that's where we need to assign into. While also considering offset, length and position. In our case we'll also forget about the assigned addr, as it's just a suggestion. The length and position may matter, well length depends on the HEAPU8 as well, since our file contents is never inside the HEAPU8 by default, then the length matters, and position matters as well, since we are going to be offsetting from the file. Now we can get the internal buffer of the file, which is a reference, by adding a new call that returns the original buffer.

Still how are we going to do `MAP_SHARED`?

Let's look at the fact that on the syscall implementation, it will do something like:

```
SYSCALLS.mappings[ptr] = {
  malloc: ptr,
  len: len,
  allocated: allocated,
  fd: fd,
  flags: flags
};
```

So it's definitely storing those mappings, how does it know how to synchronise them?

I see it getting used in the munmap implementation, that just before munmap finishes, a `msync` is called. Ok so munmap will force an msync. And from memory, exist should also enforce everything getting synchronised, but I don't see it being used right now.

In linux even if the user process is destroyed, the kernel will handle flushing the dirty pages. So it's really part of process termination. So even if munmap will actually perform msync in Emscripten, there's nothing calling msync on process termination. Especially since JS apps have no concept of process termination. And if we don't get an automatic change to the underlying buffer in VFS, then we will never get a change. I wonder if you mmap and make a change without msync and then read the file contents from within the same process, do you read your writes?

But the fact that `SYSCALL.mappings` exist is a good sign, it means we can create some sort of backthread event that performs a periodic synchronisation, or a synchronisation of dirty pages somehow, there's nothing marking that a page is dirty or not however. But we can add it in, since we control `library_fs.js`. Nothing else uses it, so we can maintain our own mapping. So we can use a data structure with tagging, every time we write to a mapping, we mark it as dirty. But wait, how do you actually know whether a write occurred, this all happens inside uint8array. Which means changes are just made to the HEAPU8 buffer, how do you actually know whether a write occurred. You would need a JS proxy object on Uint8Array.

There is the `Module['buffer']` that is used from all the HEAPU8 and HEAPU16... etc are all derived from `Module['buffer']`. We are assuming that the buffer is an ArrayBuffer.

It's possible to do this with the option `ALLOW_MEMORY_SHARING` that anables you to specify `Module['buffer']` before the program runs, and everything will use that buffer. The base of memor yis defined by `GLOBAL_BASE` at compile time. Could this be used to create a ArrayBuffer base that supports the ability to stitch together non-contiguous buffers? Sharing a single buffer, still it's seems pretty complicated, can we use something simpler?

It might be possible to instead proxy the ArrayBuffer. Such that accesses against the ArrayBuffer gets understood. But there is no access directly to the ArrayBuffer, it is all mediated via `Uint8Array`. This is not the same as the Buffer object itself. And we can't override `HEAPU8` we can only do it for `ArrayBuffer`. Seems like it is possible to do it on a Uin8Array. Are we really going to do this for HEAPU8? Apparently it is possible to proxy a unit8array and then pass its internal buffer property, will this still preserve all sorts of proxying functionality!? I don't thik it can work. There are just methods to run on the ArrayBuffer that we can proxy.

Wait according to posix: "The effect of changing the size of the underlying file of a mapping on the pages that correspond to added or removed regions of the file is unspecified".

Ok we are going to give up trying to create mmap for `MAP_SHARED`, it's just impossible in our case!

```
  // we cannot emulate the semantics of MAP_SHARED
  // the buffer reference would not be maintained through other writes
  // this is because we don't have the concept of a page table
  // and writes create a whole new buffer reference
  // to properly emulate MAP_SHARED, you need the page table
```

Then this page table would mediate synchronisation between the pages in virtual memory, and the disk memory, by accessing the inode's buffer and properly using the offsets into the inode buffer.

---

OH SHIT... libgit2 uses `MAP_SHARED`.

Ok there's only one place that is an issue that cannot be done just by using `NO_MMAP` constant. That's the function `write_at` that uses `GIT_PROT_WRITE` and `GIT_MAP_SHARED`, since if it's not write, you can just use private mapping anyway. So who calls this function? This basically gets used all across `indexer.c`. Without a mmap implementation that allows write access, I don't think the indexer works. It's all here: https://github.com/libgit2/libgit2/issues/4376

OH MAN... why...

https://groups.google.com/forum/#!topic/emscripten-discuss/63jY4CTbL6k
https://github.com/kripken/emscripten/pull/981
https://stackoverflow.com/questions/5902629/mmap-msync-and-linux-process-termination

Ok the only solution are these:

1. Change VFS such that instead of using Buffer.from and buffer constructions, that it uses the malloc from emscripten. This means all the files are actually stored on Emscripten's heap instead of in general. This also means all buffers are just views of that data on Emscripten's heap.
2. Figure out a way to proxy the typed array or array buffer, such that writes done to the done to the emscripten heap are properly checked for mapped areas, and propagated to the underlying buffer. But this needs to be done 2-way, that is as the buffer gets changed in other ways, those changes will need to propagate back to the typed array or array buffer. But this does not work because of the fact that the buffer reference can get changed as well during writes that extend the file. This is solved from instead of mapping the underlying buffer, we map the inode plus the range. This ensures that reads and writes always come from the relevant inode. However it still doesn't solve the problem of propagating changes to the underlying file to the process address space. This could be solved with a memory manager and memory descriptor semantics, that is instead of giving each mmap of the same file a different "mmap" object, you give them the same "mmap" object.

```
MMAP AREA 1
           \
            INODE -> BUFFER
           /
MMAP AREA 2
```

If you mediate the reads and writes to each mmap area to always go through the same inode, then it should be possible for reads and writes to be communicated to each other immediately, since it's always the same thing.

SO this is it, we'll need to implement a virtual memory manager by way of ES6 proxying the internal buffer some how. We'll need to do some experiments with the typed arrays and other stuff. Note that apparently propagating the memory to other processes and propagating the change to disk is apparently 2 independent flows. So it's possible for processes to see a write immediately, but also the actual page may not be written to disk yet.

Oh man why does proxy of an object not work on the prototype itself. It just complains that it cannot access the typedarray buffer property.

If the receiver is not used in `Relect.get`, then there's no error when accessing properties onto the prototype. It just works. But why is the receiver important, apparently it's used when you are accessing something that isn't the proxy. Like if `obj.x` is accessing x, then `obj` is the receiver, but it's not the proxy. Perhaps the receiver is used to avoid infinite recursive access. But what could it be used for elsewhere? Oh so the target may not be the receiver, most times they are the same, but sometimes they are not. So if you access via the target, that's the target that the proxy is wrapping, but the receiver is explicitly accessing the proxy again allow recursive access of the proxy. This is why it fails!?

So if you use the reflect, and you use receiver, it needs to realise that the receiver is actually the prototype, and not the original object. You cannot have the receiver be the proxy when accessing the proxy.

Apparently the receiver is also the `this` value. So it can also be any thing that inherits the proxy as well.

So target and receiver are the not same object, however they share the same prototype. In this case, both target and receiver are instances of the wrapped target. And they share the same keys as well.

```
Reflect.getPrototypeOf(target) === Reflect.getPrototypeOf(receiver) === Reflect.getPrototypeOf(originalTarget);
```

YEP the target is the origTarget, the receiver is the proxy.

Ok i'm giving up on this emscripten libgit2. I'm going to rewrite git in JS. That would be easier.
Still this wasn't a total waste, we find out that we can use proxies on buffers too in order to create a virtual buffer. That should be pretty interesting.

It's also just too many problems. Like trying to hack the heap to be a virtual memory system using ES6 proxies on typed arrays and performing bidirectional memory mapping. And really creating a soft MMU is just crazy and full of unexplored JS behaviour and performance problems. And not to mention all of the libgit2 portability problems. It looks like it will be easier to rewrite git from scratch here, but building on top of existing js implementations as well.
