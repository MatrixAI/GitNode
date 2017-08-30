{ pkgs ? import <nixpkgs> {} }:
  with pkgs;
  stdenv.mkDerivation {
    name = "js-virtualgit";
    buildInputs = [ emscripten python2 nodejs nodePackages.node2nix flow ];
  }
