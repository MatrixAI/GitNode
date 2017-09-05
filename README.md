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

When using `-O2`, libgit2 will produce both the `.js` and `.js.mem` at the end. This may be undesirable, because when bundling with rollup, it's possible rollup won't know about this file. Further more when loading into the browser, both files will need to be loaded indepedently. The basic reason for this is that large JS files may have problems when loaded by the browser. I think this optimisation is not necessary for libgit2.js, so we should just do: `--memory-init-file=0`. However this is only needed on the final compilation to `.js`. Note that there's also a `Module.memoryInitializerPrefixUrl` that can point to a particular location of the `.js.mem` file which can be loaded by the browser, but again this doesn't seem relevant to non-browser usage.
