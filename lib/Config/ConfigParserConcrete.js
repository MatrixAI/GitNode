// @flow

import typeof { Token as TokenConstructor } from 'chevrotain';
import type { Cursor } from './ConfigCursors.js';

import { Parser, EOF, tokenMatcher } from 'chevrotain';

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

import { CursorSection, CursorKeyValue } from './ConfigCursors.js';

type interpret = (path) => any;
type cst = cstLeaf | cstNode;
type cstLeaf = {
  image: string,
  type: TokenConstructor
};
type cstNode = {
  name: string,
  childList: Array<cst>,
  childDict: {[string]: Array<cst>}
};
type cstIndex = Map<string, Array<cstCursor>>;
type cstTags = WeakMap<cstCursor, cst>;
type cstCursor = Cursor;

function cstCreate (name): cst {
  return {
    name: name,
    childList: [],
    childDict: {}
  };
}

function cstPush (parentCst, name, childCst) {
  parentCst.childList.push(childCst);
  const dictArr = parentCst.childDict[name];
  if (dictArr) {
    dictArr.push(childCst);
  } else {
    parentCst.childDict[name] = [childCst];
  }
}

function head (arr: ?Array<any>) {
  if (arr) {
    return arr[0];
  } else {
    return undefined;
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
    cstIndex: cstIndex = new Map,
    cstTags: cstTags = new WeakMap
  ): cst {
    super.input = input;
    this._cstIndex = cstIndex;
    this._cstTags = cstTags;
    this._cstRoot = cstCreate('root', ['top']);
    cstPush(this._cstRoot, 'top', this.top());
    return this._cstRoot;
  }

  // top ::= formatting? (section)* EOF
  top = this.RULE('top', (): cst => {
    const cst = cstCreate('top');
    this.OPTION1(() => {
      cstPush(
        cst,
        'formatting',
        this.SUBRULE1(this.formatting)
      );
    });
    this.MANY(() => {
      cstPush(
        cst,
        'section',
        this.SUBRULE2(this.section)
      );
    });
    cstPush(
      cst,
      'EOF',
      this.CONSUME(EOF)
    );
    return cst;
  });

  // formatting ::= (WhiteSpaceT | CommentT | EndOfLineT)+
  formatting = this.RULE('formatting', (): cst => {
    const cst = cstCreate('formatting');
    this.AT_LEAST_ONE(() => {
      this.OR([
        {ALT: () => {
          cstPush(
            cst,
            'WhiteSpaceT',
            this.CONSUME(WhiteSpaceT)
          );
        }},
        {ALT: () => {
          cstPush(
            cst,
            'CommentT',
            this.CONSUME(CommentT)
          );
        }},
        {ALT: () => {
          cstPush(
            cst,
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
    const cst = cstCreate('section');
    const header = this.SUBRULE1(this.header);
    cstPush(cst, 'header', header);
    const headingToken = (
      head(header.childDict.HeaderIncludeIfT) ||
      head(header.childDict.HeaderIncludeT) ||
      head(header.childDict.HeaderNameT)
    );
    const headingSubToken = head(header.childDict.HeaderSubNameT);
    let include = false;
    if (tokenMatcher(headingToken, HeaderIncludeT)) {
      include = true;
    } else if (tokenMatcher(headingToken, HeaderIncludeIfT)) {
      console.log('TODO conditional include');
    }
    let indexKey = headingToken.image;
    if (headingSubToken) indexKey += '.' +  headingSubToken.image.slice(1, -1);
    const cursor = new CursorSection(cst);
    this._cstTags.set(cursor, this._cstRoot);
    const cursors = this._cstIndex.get(indexKey);
    if (cursors) {
      cursors.push(cursor);
    } else {
      this._cstIndex.set(indexKey, [cursor]);
    }
    this.OPTION1(() => {
      cstPush(
        cst,
        'formatting',
        this.SUBRULE2(this.formatting)
      );
    });
    this.OPTION2(() => {
      cstPush(
        cst,
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
    const cst = cstCreate('header');
    cstPush(
      cst,
      'headerEnter',
      this.SUBRULE(this.headerEnter)
    );
    this.OR([
      {ALT: () => {
        cstPush(
          cst,
          'HeaderIncludeIfT',
          this.CONSUME(HeaderIncludeIfT)
        );
      }},
      {ALT: () => {
        cstPush(
          cst,
          'HeaderIncludeT',
          this.CONSUME(HeaderIncludeT)
        );
      }},
      {ALT: () => {
        cstPush(
          cst,
          'HeaderNameT',
          this.CONSUME(HeaderNameT)
        );
      }}
    ]);
    this.OPTION1(() => {
      cstPush(
        cst,
        'WhiteSpaceT',
        this.CONSUME(WhiteSpaceT)
      );
    });
    this.OPTION2(() => {
      cstPush(
        cst,
        'HeaderSubNameT',
        this.CONSUME(HeaderSubNameT)
      );
    });
    cstPush(
      cst,
      'BodyEnterT',
      this.CONSUME(BodyEnterT)
    );
    return cst;
  });

  // header ::= HeaderEnterT | BodyExitT
  headerEnter = this.RULE('headerEnter', (): cst => {
    const cst = cstCreate('headerEnter');
    this.OR([
      {ALT: () => {
        cstPush(
          cst,
          'HeaderEnterT',
          this.CONSUME(HeaderEnterT)
        );
      }},
      {ALT: () => {
        cstPush(
          cst,
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
      const cst = cstCreate('body');
      this.MANY(() => {
        cstPush(
          cst,
          'keyValue',
          this.SUBRULE1(this.keyValue, [indexKey, include])
        );
        this.OPTION(() => {
          cstPush(
            cst,
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
      const cst = cstCreate('keyValue');
      const keyToken = this.CONSUME(BodyKeyT);
      cstPush(cst, 'BodyKeyT', keyToken);
      indexKey += '.' + keyToken.image;
      const cursor = new CursorKeyValue(cst);
      this._cstTags.set(cursor, this._cstRoot);
      const cursors = this._cstIndex.get(indexKey);
      if (cursors) {
        cursors.push(cursor);
      } else {
        this._cstIndex.set(indexKey, [cursor]);
      }
      this.OPTION1(() => {
        cstPush(
          cst,
          'WhiteSpaceT',
          this.CONSUME(WhiteSpaceT)
        );
      });
      cstPush(
        cst,
        'ValueEnterT',
        this.CONSUME(ValueEnterT)
      );
      cstPush(
        cst,
        'value',
        this.SUBRULE2(this.value)
      );
      this.OPTION2(() => {
        cstPush(
          cst,
          'ValueExitT',
          this.CONSUME(ValueExitT)
        );
      });
      return cst;
    }
  );

  // value ::= (ValueSpaceT | ValueLineContinuationT | ValueStringT | ValueQuotedStringT)*
  value = this.RULE('value', (): cst => {
    const cst = cstCreate('value');
    this.MANY(() => {
      this.OR([
        {ALT: () => {
          cstPush(
            cst,
            'ValueSpaceT',
            this.CONSUME(ValueSpaceT)
          );
        }},
        {ALT: () => {
          cstPush(
            cst,
            'ValueLineContinuationT',
            this.CONSUME(ValueLineContinuationT)
          );
        }},
        {ALT: () => {
          cstPush(
            cst,
            'ValueStringT',
            this.CONSUME(ValueStringT)
          );
        }},
        {ALT: () => {
          cstPush(
            cst,
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
