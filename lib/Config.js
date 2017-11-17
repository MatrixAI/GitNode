// @flow

import { Token, Lexer, Parser } from 'chevrotain';

// all inclusions could be listed in a different place that gets parsed..
// well no since remember multivalued things, and the last thing that parsed is the finalvalue for a single get
// so we need to parse it immediately
// also this means we do need access to the FS

class Config {

  // this contains the entire parsed and included configuration
  // not the original text, this means it includes all inclusions
  // to synchronise back into text
  // means using the parser and being aware of options there
  _fs: VirtualFS;
  _configPath: string;
  _configParsed: config;

  constructor (fs: VirtualFS, path: string) {
    this._fs = fs;
    this._configPath = path;
    this._parse();
  }

  _parse (configFile: string) {
  }

  _decode (text: string): {
  }

  _encode (config): string {
  }

  // setting a single item, does it respect the inclusion constructs?
  // it does not affect the config inclusions
  // so while you get properties, it only mutates the actual single construct
  // we can represent inclusions as kind of prototype chain
  // so properties can be asked based on the prototype
  // rely on JS prototypes to do this (which means changing from Map to a different thing)
  // or manually do it from Env construct that contains a linked list of maps?
  // what does it mean theN?
  // yep it only edits the current file, while looking at includes when it needs to
  // inclusions and settings are only done on the current file
  // so you cannot just set it based on the parsed construct and just encode it back to a string
  // inclusions need to be kept separate
  // and only looked up when acquiring attributes, but never for setting attributes


  // setting is done like git config core.filemode true
  set (key: string, value: string) {

  }

  get (key: string, entry()) {

  }

  del (key: string) {

  }
  // del_multivar

  // act like an iterator as well

}

export default Config;
