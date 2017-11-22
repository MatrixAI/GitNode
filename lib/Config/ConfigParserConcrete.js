import typeof { Token as TokenConstructor } from 'chevrotain';

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


// a string of the format `section subsection? key`, arr.join(' ')
/* type cst = Object;
 * type configKey = string;
 * type configIndex = Map<configKey, Array<ValueProxy>>;
 * type inclusions = Set<number>;*/

// investigate this in the future
// https://pavpanchekha.com/blog/zippers/multi-zippers.html
class CSTCursor {
  _cst: Object;
  constructor (cst) {
    this._cst = cst;
    // instead we give the path to the actual object as well
    // yea the idea is a cursor into the tree
    // but unlike a zipper we're not directly going into it
    // we are navigating into the tree
  }
}

class ValueProxy {
  constructor () {

  }
  stringOf () {
    return cst.stringOf();
  }
  valueOf () {
    return cst.valueOf();
  }
}



type TokenInstance = { image: string, type?: TokenConstructor };
type CSTList = Array<CST>;
type CSTDict = { [string]: Array<CST> };
type CST = TokenInstance | CSTNode;

class CSTNode {

  name: string;
  childList: CSTList;
  childDict: CSTDict;

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
  _treeIndex: Object; // assume this is a MAP of a sort
  // every time we acquire the key, we must write the entire path
  // to that key to the config index
  // while also producing a value proxy on this internal object

  constructor (interpret) {
    super([], lexicalGrammar);
    this._interpret = interpret;
    Parser.performSelfAnalysis(this);
  }

  execute (input, treeIndex): CSTNode {
    // the tree index is an MAP from indexstrings to CSTCursor
    this._treeIndex = treeIndex;
    super.input = input;
    // the global CST is always available as it is assigned by reference
    // the section keys are then already part of the individual cst right?
    return this.top();
  }

  // top ::= formatting? (section)* EOF
  top = this.RULE('top', (): CSTNode => {
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
  formatting = this.RULE('formatting', (): CSTNode => {
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
  section = this.RULE('section', (): CSTNode => {
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
    this._treeIndex.set(indexKey, new CSTCursor(cst));


    this.OPTION1(() => {
      cst.push(
        'formatting',
        this.SUBRULE2(this.formatting)
      );
    });
    this.OPTION2(() => {
      cst.push(
        'body',
        this.SUBRULE3(this.body, [include, indexKey])
      );
    });

    return cst;
  });

  // header ::= headerEnter
  //            (HeaderIncludeIfT | HeaderIncludeT | HeaderNameT)
  //            WhiteSpaceT?
  //            HeaderSubNameT?
  //            BodyEnterT
  header = this.RULE('header', (): CSTNode => {
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
  headerEnter = this.RULE('headerEnter', (): CSTNode => {
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
    (include: boolean = false, indexKey: string): CSTNode => {
      const cst = new CSTNode('body', 'keyValue', 'formatting');
      this.MANY(() => {
        cst.push(
          'keyValue',
          this.SUBRULE1(this.keyValue, [include, indexKey])
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
    (include: boolean = false, indexKey: string): CSTNode => {
      const cst = new CSTNode(
        'keyValue',
        'BodyKeyT',
        'WhiteSpaceT',
        'ValueEnterT',
        'value',
        'ValueExitT'
      );
      const keyToken = this.CONSUME(BodyKeyT);
      cst.push('key', keyToken);

      indexKey += '.' + keyToken.image;
      this._treeIndex.set(indexKey, new CSTCursor(cst));

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
  value = this.RULE('value', (): CSTNode => {
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
