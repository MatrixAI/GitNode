// @flow

import { Token, Lexer, Parser } from 'chevrotain';

type VirtualFS = Object;

// the current git config format is restricted to 1 level of subsections
// however the types here are more general allowing n levels of subsections
type configKey = string;
type configValue = string|number|boolean;
type configMap = Map<configKey, configMap> | Array<configValue>;
type config = Map<configKey, configMap>;

const allTokens = [
  True,
  False
];

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

    // this needs to parse a single file
    // and parse all of its inclusions
    // and do it in order
    // however every inclusion involves a new context
    // so that edits against the file still occurs against the original config file
    // and we maintiain the structure of the original config file
    // but configParsed maintains the global view over the entire config file
    // how do we maintain different contexts?
    // oh in the situation when there are multiple values
    // then setting is now allowed, instead it must use add
    // by default all values are assumed to be a single value and not a multivalue thing
    // oh we don't have to maintain multiple contexts
    // all we do is set it on our configParsed
    // and append it to the config file
    // simple!
    // well we look for the right place and we set the exact value
    // first we check if the value already exists
    // and if it is a multiple value
    // ok I get it... if there are multiple values in the same config file, then it's an issue unless you add it
    // and if there are none, you find the exact position and you change the value
    // without changing anything else
    // so don't we need to parse the file on each and every config setting
    // that's pretty annoying
    // instead if we maintain a Concrete Syntax Tree, we'd be able to find where and when to switch, and it'd be done
    // however this would not work nicely for situations with concurrent access
    // we assume single file access!!
    // libgit2 does this, by parsing the file each time and perfroming a config refresh
    // this means you create a new CST each time you want to change it
    // i guess that works too

  }

  _decode (text: string): {
    // private functions

  }

  _encode (config: Config): string {

    // private functions

    // converting it all to strings again
    // means encoding it as a flat file
    // not setting a single item

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
