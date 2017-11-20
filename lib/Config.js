// @flow

import typeof { VirtualFS } from 'virtualfs';

import { ConfigInterpreter } from './Config/ConfigInterpreter.js';

type path = string;

class Config {

  _fs: VirtualFS;
  _path: path;
  _interpreter: ConfigInterpreter;
  _localConfig: config;
  _globalConfig: config;

  constructor (fs: VirtualFS, path: path) {
    this._fs = fs;
    this._path = path;
    const interpreter = new ConfigInterpreter(fs);
    this._interpreter = interpreter;
    this._localConfig = interpreter.interpret(path, false);
    this._globalConfig = interpreter.interpret(path, true);
  }

  _toFile () {
    // we need some sort of serialiser for the same data
    this._fs.writeFileSync(this._path, false);
  }

  set ([header, headerSub]: Array<string>, key: string, values: Array<string>) {

  }

  // get multiple values
  get ([header, headerSub]: Array<string>, key: string): Array<string> {


  }

  del ([header, headerSub]: Array<string>, key: string) {

  }

}

export default Config;
