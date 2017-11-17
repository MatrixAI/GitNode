// @flow

import type { config } from './ConfigParser.js';

import { configLexer } from './ConfigLexer.js';
import ConfigParser from './ConfigParser.js';

type readFile = (string) => string;

class ConfigInterpreter {

  _readFile: readFile;

  constructor (readFile: readFile) {
    this._readFile = readFile;
  }

  interpret (path: string, map: config = new Map, condition: ?string = null) {
    console.log('PATH TO INCLUDE', path);
    // we need to test what happens to when inclusions failure conditions what happens then!
    if (condition) {
      // test the condition and if the test doesn't work, then don't do anything to the map
      console.log('TEST CONDITION!');
    }
    const text = this._readFile(path);
    const tokens = configLexer.tokenize(text).tokens;
    const parser = new ConfigParser(this.interpret.bind(this));
    parser.execute(tokens, map);
    return map;
  }

}

export default ConfigInterpreter;
