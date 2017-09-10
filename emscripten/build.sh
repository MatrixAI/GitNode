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

emcc \
  --bind \
  -O2 \
  -Wall \
  -Werror \
  libgit2_wrapper.c \
  -o libgit2_wrapper.bc

emcc \
  -Wall \
  -Werror \
  -O2 \
  --bind \
  --memory-init-file 0 \
  --pre-js ./prejs.js \
  -s "EXTRA_EXPORTED_RUNTIME_METHODS=['FS']" \
  -s FORCE_FILESYSTEM=1 \
  -s PRECISE_I64_MATH=1 \
  -s PRECISE_F32=1 \
  -s ASSERTIONS=2 \
  libgit2_wrapper.bc \
  libgit2.bc \
  -o libgit2.js

# require libgit2.js into VirtualGit.js module
# expose a JS wrapper around functions and JS semantics
# moduralize and export name may not actually work
# the --memory-init-file=0 makes sure not to have a separate memory file
# since this is not designed for browser usage, or well it's geared towards system usage anyway
# libgit2.js would eventually be required by VirtualGit.js and then a proper cjs module and es6 module exposed here, which has to allow the insertion of the VirtualFS as a parameter from the outside
