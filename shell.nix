{ pkgs ? import <nixpkgs> {} }:
  with pkgs;
  stdenv.mkDerivation {
    name = "js-virtualgit";
    buildInputs = [
      emscripten
      cmake
      pkgconfig
      python2
      nodejs
      nodePackages.node2nix
      flow
    ];
    shellHook = ''
      EMSCRIPTEN_ROOT_PATH='${emscripten}/share/emscripten'
      EMSCRIPTEN='${emscripten}/share/emscripten'
    '';
  }
