// @flow

import type { config } from './ConfigParser.js';

import { posix as pathPosix } from 'path';
import { configLexer } from './ConfigLexer.js';
import ConfigParser from './ConfigParser.js';

type path = string;
type fs = Object;

class ConfigInterpreterError extends Error {

  static ERROR_PARSE = 1;
  static ERROR_LOOP = 2;
  code: number;
  parseErrors: ?Object;

  constructor (code: number, message: ?string, parseErrors: ?Object) {
    super(message);
    this.code = code;
    this.parseErrors = parseErrors;
  }

}

class ConfigInterpreter {

  _fs: fs;

  constructor (fs: fs) {
    this._fs = fs;
  }

  interpret (path: path, limit: number = 10) {
    // an inclusion limit of 10 replicates git behaviour
    // note that the same file can be included multiple times as long as the inclusion graph
    // is still a DAG
    return this._interpret(path, new Map, limit);
  }

  _interpret (path: path, map: config, limit: ?number, condition: ?string) {
    // to allow arbitrary number of inclusions while preventing loops
    // requires the use of creating sets of inodes and passing it down
    // each depth branch of inclusion, and checking for repeat inclusions
    if (limit != null) {
      if (limit === 0) {
        throw new ConfigInterpreterError(
          ConfigInterpreterError.ERROR_LOOP,
          `Repeat inclusion of ${path}`
        );
      }
      --limit;
    }
    if (condition) {
      throw new Error('Conditional Includes have not yet been implemented');
    }
    path = this._fs.realpathSync(path);
    let text;
    try {
      text = this._fs.readFileSync(path, 'utf8');
    } catch (e) {
      // if the file doesn't exist, we just return the map
      if (e.code === 'ENOENT') {
        return map;
      }
      throw e;
    }
    // if the text is empty, we don't need to parse anything
    if (text) {
      const tokens = configLexer.tokenize(text).tokens;
      // allow recursive interpretation
      const parser = new ConfigParser(
        (newPath, map, newLimit, newCondition) => {
          // if the new path begins with ., it must start from the directory of the including file
          if (newPath[0] === '.') {
            newPath = pathPosix.join(pathPosix.dirname(path), newPath);
          }
          return this._interpret(newPath, map, newLimit, newCondition);
        },
        limit
      );
      parser.execute(tokens, map);
      if (parser.errors.length > 0) {
        throw new ConfigInterpreterError(
          ConfigInterpreterError.ERROR_PARSE,
          'Parsing errors',
          parser.errors
        );
      }
    }
    return map;
  }

}

export { ConfigInterpreter, ConfigInterpreterError };
