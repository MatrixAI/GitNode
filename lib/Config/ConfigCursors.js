// @flow

import type { cst } from './ConfigParserConcrete.js';

import {
  ValueLineContinuationT,
  ValueSpaceT,
  ValueStringT,
  ValueQuotedStringT,
} from './ConfigLexer.js';

class Cursor {
  _cst: cst;
  constructor (cst: cst) {
    this._cst = cst;
  }
}

class CursorSection extends Cursor {

  constructor (cst: cst) {
    if (cst.name !== 'section') {
      throw new Error('Oh No!');
    }
    super(cst);
  }

}

class CursorKeyValue extends Cursor {

  constructor (cst: cst) {
    if (cst.name !== 'keyValue') {
      throw new Error('Oh No!');
    }
    super(cst);
  }

  getKey () {
    return this._cst.childDict.BodyKeyT[0].image;
  }

  getValue () {
    const valueChildren = this._cst.childDict.value[0].childList;
    let value = '';
    for (const valueToken of valueChildren) {
      switch (valueToken.type) {
      case ValueSpaceT:
      case ValueStringT:
        value += valueToken.image;
        break;
      case ValueQuotedStringT:
        value += valueToken.image.slice(1, -1);
        break;
      }
    }
    return value;
  }

  setValue (value) {
    const valueToken = {
      image: `"${value}"`,
      type: ValueQuotedStringT
    };
    this._cst.childDict.value[0].childList = [valueToken];
    this._cst.childDict.value[0].childDict = {
      ValueQuotedStringT: [valueToken]
    };
  }

}

export { CursorSection, CursorKeyValue };

export type { Cursor };
