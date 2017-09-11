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
  --pre-js ./pre.js \
  --post-js ./post.js \
  --js-library ./library_virtualfs.js \
  -s "EXTRA_EXPORTED_RUNTIME_METHODS=['FS']" \
  -s PRECISE_I64_MATH=1 \
  -s PRECISE_F32=1 \
  -s ASSERTIONS=2 \
  ./libgit2_wrapper.bc \
  ./libgit2.bc \
  -o ./libgit2.js

// if the resulting js uses es6 modules
// you need to use babel and rollup to use it
