{ pkgs ? import <nixpkgs> {} }:
  with pkgs;
  stdenv.mkDerivation {
    name = "js-virtualgit";
    buildInputs = [
      emscripten
      cmake
      pkgconfig
      libssh2
      zlib
      openssl
      curl
      http-parser
      python2
      nodejs
      nodePackages.node2nix
      flow
    ];
  }
