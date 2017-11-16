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

  interpret (path: string, map: config = new Map) {
    const text = this._readFile(path);
    const tokens = configLexer.tokenize(text).tokens;
    const parser = new ConfigParser(this.interpret.bind(this));
    parser.parse(tokens, map);
    return map;
  }

}

export default ConfigInterpreter;
