// @flow
import typeof { Token as TokenConstructor } from 'chevrotain';

import {
  Parser,
  EOF,
  tokenMatcher,
  getTokenConstructor
} from 'chevrotain';
import {
  WhiteSpaceT,
  CommentT,
  EndOfLineT,
  HeaderEnterT,
  HeaderNameT,
  HeaderIncludeIfT,
  HeaderIncludeT,
  HeaderSubNameT,
  BodyEnterT,
  BodyKeyT,
  BodyExitT,
  ValueEnterT,
  ValueLineContinuationT,
  ValueSpaceT,
  ValueStringT,
  ValueQuotedStringT,
  ValueExitT,
  lexicalGrammar
} from './ConfigLexer.js';

type interpret = (path) => any;
type tokenObj = { image: string, type?: TokenConstructor };
type cstList = Array<cst>;
type cstDict = { [string]: Array<cst> };
type cst = tokenObj | CSTNode;
type cstIndex = Map<string, Array<CSTCursor>>;
type cstTags = WeakMap<CSTCursor, cst>;

// https://pavpanchekha.com/blog/zippers/multi-zippers.html
class CSTCursor {

  _cst: cst;

  constructor (cst: cst) {
    this._cst = cst;
  }

}

class SectionCursor extends CSTCursor {

}

class KeyValueCursor extends CSTCursor {
  getKey () {
    return this._cst.childDict.BodyKeyT[0].image;
  }
  getValue () {
    const valueChildren = this._cst.childDict.value[0].childList;
    let value = '';
    for (const valueToken of valueChildren) {
      switch (getTokenConstructor(valueToken)) {
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
  changeValue () {

  }
}

class CSTNode {

  name: string;
  childList: cstList;
  childDict: cstDict;

  constructor (name, ...childNames) {
    this.name = name;
    this.childList = [];
    let childDict = {};
    for (const childName of childNames) {
      childDict[childName] = [];
    }
    this.childDict = childDict;
  }

  push (name, object) {
    this.childList.push(object);
    const dictArr = this.childDict[name];
    if (dictArr) {
      dictArr.push(object);
    } else {
      this.childDict[name] = [object];
    }
  }

}

class ConfigParser extends Parser {

  _interpret: ?interpret;
  _cstIndex: cstIndex;
  _cstTags: cstTags;
  _cstRoot: cst;

  constructor (interpret: ?interpret) {
    super([], lexicalGrammar);
    this._interpret = interpret;
    Parser.performSelfAnalysis(this);
  }

  execute (
    input: Array<tokenObj>,
    cstIndex: cstIndex,
    cstTags: cstTags
  ): cst {
    super.input = input;
    this._cstIndex = cstIndex;
    this._cstTags = cstTags;
    this._cstRoot = new CSTNode('root', 'top');
    this._cstRoot.push('top', this.top());
    return this._cstRoot;
  }

  // top ::= formatting? (section)* EOF
  top = this.RULE('top', (): cst => {
    const cst = new CSTNode('top', 'formatting', 'section', 'EOF');
    this.OPTION1(() => {
      cst.push(
        'formatting',
        this.SUBRULE1(this.formatting)
      );
    });
    this.MANY(() => {
      cst.push(
        'section',
        this.SUBRULE2(this.section)
      );
    });
    cst.push(
      'EOF',
      this.CONSUME(EOF)
    );
    return cst;
  });

  // formatting ::= (WhiteSpaceT | CommentT | EndOfLineT)+
  formatting = this.RULE('formatting', (): cst => {
    const cst = new CSTNode('formatting', 'WhiteSpaceT', 'CommentT', 'EndOfLineT');
    this.AT_LEAST_ONE(() => {
      this.OR([
        {ALT: () => {
          cst.push(
            'WhiteSpaceT',
            this.CONSUME(WhiteSpaceT)
          );
        }},
        {ALT: () => {
          cst.push(
            'CommentT',
            this.CONSUME(CommentT)
          );
        }},
        {ALT: () => {
          cst.push(
            'EndOfLineT',
            this.CONSUME(EndOfLineT)
          );
        }}
      ]);
    });
    return cst;
  });

  // section ::= header formatting? body?
  section = this.RULE('section', (): cst => {
    const cst = new CSTNode('section', 'header', 'formatting', 'body');
    const header = this.SUBRULE1(this.header);
    cst.push('header', header);
    const headingToken = (
      header.childDict.HeaderIncludeIfT[0] ||
      header.childDict.HeaderIncludeT[0] ||
      header.childDict.HeaderNameT[0]
    );
    const headingSubToken = header.childDict.HeaderSubNameT[0];
    let include = false;
    if (tokenMatcher(headingToken, HeaderIncludeT)) {
      include = true;
    } else if (tokenMatcher(headingToken, HeaderIncludeIfT)) {
      console.log('TODO conditional include');
    }
    let indexKey = headingToken.image;
    if (headingSubToken) indexKey += '.' +  headingSubToken.image.slice(1, -1);
    const cursor = new SectionCursor(cst);
    this._cstTags.set(cursor, this._cstRoot);
    const cursors = this._cstIndex.get(indexKey);
    if (cursors) {
      cursors.push(cursor);
    } else {
      this._cstIndex.set(indexKey, [cursor]);
    }
    this.OPTION1(() => {
      cst.push(
        'formatting',
        this.SUBRULE2(this.formatting)
      );
    });
    this.OPTION2(() => {
      cst.push(
        'body',
        this.SUBRULE3(this.body, [indexKey, include])
      );
    });
    return cst;
  });

  // header ::= headerEnter
  //            (HeaderIncludeIfT | HeaderIncludeT | HeaderNameT)
  //            WhiteSpaceT?
  //            HeaderSubNameT?
  //            BodyEnterT
  header = this.RULE('header', (): cst => {
    const cst = new CSTNode(
      'header',
      'headerEnter',
      'HeaderIncludeIfT',
      'HeaderIncludeT',
      'HeaderNameT',
      'WhiteSpaceT',
      'HeaderSubNameT',
      'BodyEnterT'
    );
    cst.push(
      'headerEnter',
      this.SUBRULE(this.headerEnter)
    );
    this.OR([
      {ALT: () => {
        cst.push(
          'HeaderIncludeIfT',
          this.CONSUME(HeaderIncludeIfT)
        );
      }},
      {ALT: () => {
        cst.push(
          'HeaderIncludeT',
          this.CONSUME(HeaderIncludeT)
        );
      }},
      {ALT: () => {
        cst.push(
          'HeaderNameT',
          this.CONSUME(HeaderNameT)
        );
      }}
    ]);
    this.OPTION1(() => {
      cst.push(
        'WhiteSpaceT',
        this.CONSUME(WhiteSpaceT)
      );
    });
    this.OPTION2(() => {
      cst.push(
        'HeaderSubNameT',
        this.CONSUME(HeaderSubNameT)
      );
    });
    cst.push(
      'BodyEnterT',
      this.CONSUME(BodyEnterT)
    );
    return cst;
  });

  // header ::= HeaderEnterT | BodyExitT
  headerEnter = this.RULE('headerEnter', (): cst => {
    const cst = new CSTNode('headerEnter', 'HeaderEnterT', 'BodyExitT');
    this.OR([
      {ALT: () => {
        cst.push(
          'HeaderEnterT',
          this.CONSUME(HeaderEnterT)
        );
      }},
      {ALT: () => {
        cst.push(
          'BodyExitT',
          this.CONSUME(BodyExitT)
        );
      }}
    ]);
    return cst;
  });

  // body ::= (keyValue formatting?)*
  body = this.RULE(
    'body',
    (indexKey: string, include: boolean = false): cst => {
      const cst = new CSTNode('body', 'keyValue', 'formatting');
      this.MANY(() => {
        cst.push(
          'keyValue',
          this.SUBRULE1(this.keyValue, [indexKey, include])
        );
        this.OPTION(() => {
          cst.push(
            'formatting',
            this.SUBRULE2(formatting)
          );
        });
      });
      return cst;
    }
  );

  // keyValue ::= BodyKeyT WhiteSpaceT? ValueEnterT value ValueExitT?
  keyValue = this.RULE(
    'keyValue',
    (indexKey: string, include: boolean = false): cst => {
      const cst = new CSTNode(
        'keyValue',
        'BodyKeyT',
        'WhiteSpaceT',
        'ValueEnterT',
        'value',
        'ValueExitT'
      );
      const keyToken = this.CONSUME(BodyKeyT);
      cst.push('BodyKeyT', keyToken);
      indexKey += '.' + keyToken.image;
      const cursor = new KeyValueCursor(cst);
      this._cstTags.set(cursor, this._cstRoot);
      const cursors = this._cstIndex.get(indexKey);
      if (cursors) {
        cursors.push(cursor);
      } else {
        this._cstIndex.set(indexKey, [cursor]);
      }
      this.OPTION1(() => {
        cst.push(
          'WhiteSpaceT',
          this.CONSUME(WhiteSpaceT)
        );
      });
      cst.push(
        'ValueEnterT',
        this.CONSUME(ValueEnterT)
      );
      cst.push(
        'value',
        this.SUBRULE2(this.value)
      );
      this.OPTION2(() => {
        cst.push(
          'ValueExitT',
          this.CONSUME(ValueExitT)
        );
      });
      return cst;
    }
  );

  // value ::= (ValueSpaceT | ValueLineContinuationT | ValueStringT | ValueQuotedStringT)*
  value = this.RULE('value', (): cst => {
    const cst = new CSTNode(
      'value',
      'ValueLineContinuationT',
      'ValueSpaceT',
      'ValueStringT',
      'ValueQuotedStringT'
    );
    this.MANY(() => {
      this.OR([
        {ALT: () => {
          cst.push(
            'ValueSpaceT',
            this.CONSUME(ValueSpaceT)
          );
        }},
        {ALT: () => {
          cst.push(
            'ValueLineContinuationT',
            this.CONSUME(ValueLineContinuationT)
          );
        }},
        {ALT: () => {
          cst.push(
            'ValueStringT',
            this.CONSUME(ValueStringT)
          );
        }},
        {ALT: () => {
          cst.push(
            'ValueQuotedStringT',
            this.CONSUME(ValueQuotedStringT)
          );
        }}
      ]);
    });
    return cst;
  });

}

export default ConfigParser;
