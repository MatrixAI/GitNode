// @flow

import type { config } from './ConfigParser.js';

import { configLexer } from './ConfigLexer.js';
import ConfigParser from './ConfigParser.js';

type path = string;
type readFile = (string) => ?string;

class ConfigInterpreterError extends Error {

  static ERROR_LOOP = 1;
  code: number;

  constructor (code: number, message: ?string) {
    super(message);
    this.code = code;
  }

}

class ConfigInterpreter {

  _readFile: readFile;
  _inclusions: Set<path>;

  constructor (readFile: readFile) {
    this._readFile = readFile;
  }

  interpret (path: path) {
    this._inclusions = new Set;
    return this._interpret(path, new Map, null);
  }

  _interpret (path: path, map: config, condition: ?string) {
    if (this._inclusions.has(path)) {
      throw new ConfigInterpreterError(ConfigInterpreterError.ERROR_LOOP);
    }
    this._inclusions.add(path);
    if (condition) {

      // will need to fork the globbing library (and its transitive dependency)
      // to use the vfs instead of fs
      // and also the tilde expansion library as well
      // all of the mocking things don't work nicely




      // test the condition and if the test doesn't work, then don't do anything to the map
      // if the condition is empty it doesn't matter
      // but here we are assuming the condition exists and we are going to evaluate the condition

      // conditions:
      // gitdir
      // gitdir/i
      // i don't think this works
      // some of these conditions rely on the external system to consider
      // instead i have a readFile
      // so...?

      console.log('TEST CONDITION!');
    }
    const text = this._readFile(path);
    if (text) {
      const tokens = configLexer.tokenize(text).tokens;
      const parser = new ConfigParser(this._interpret.bind(this));
      parser.execute(tokens, map);
    }
    return map;
  }

}

export { ConfigInterpreter, ConfigInterpreterError };
