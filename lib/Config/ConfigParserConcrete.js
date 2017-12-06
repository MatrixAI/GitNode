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

type cstIndex = Map<string, Map<cst, DLinkedList<cstCursor>>>;
// we should remember and keep track of the first
// but here each cst gives us the first
// primary cst would also give us the first cst cursor as well
// because adding and removing cursors via to creation of new key value nodes in the cst
// means updating the index
// this means the operation shouldn't be defined within the cstCursor itself
// as that would mean the cstCursor relies on the index as well
// instead, operations are defined outside
// on top of the index
// and they are functions to operate on the index data set

// we need new data structure
// one that supports the traversal of nodes
// within the actual dictionary
// this means the cursors themselves are ordered
// its explicit in the cursor, to represent a ordering
// rather than an implicit data structure
// one to do this is to use a linked list container
// within the actual cursorDict
// but to represent them as actual elements
//
// another problem
// say we use a cursor
// how does one know the right DLinkedList<cstCursor>
// to use?
// because you have a section cursor
// that may have some existing key values inside
// that section cursor might be able to insert things in the CST
// by finding the right area after the last key value position
// but that key value position itself is not itself a cursor
// the main problem... is that the cst navigation itself doesn't make use of this dlinked list
// unless as you move into a particular cst position
// you're able to iterate over the dlinked list as well?
// there must be a way to link cst manipulation to index manipulation
// creation of a new cursor must be able to be inserted in the right position
// position information must be part of the index
// are we talking about a specialised tree that specialised information?
// i got it.. we need a hierarchal index
// one that allows us to access sections, and then navigate down to access the keyvalues
// think of it like a minimal cst, with everything removed except sections
// the main idea is that this tree a like hierarchal tree, where you first choose to lookup the section, then lookup the keyvalue
// mutation of this tree, needs to go back to mutating the original cst
// but of course a different index must be used for looking up path information...
// so a virtual section vs physical section
//
// a virtual section lookup provides the keyvalues on every definition of in the real csts that have

/*

[Tree]
 VirtualSection1 -> Points to CST.RealSection1 and CST2.RealSection1
   VirtualKey => [CST.RealSection1.RealKey, CST2.RealSection1.RealKey]
   VirtualKey2 => [CST.RealSection1..RealKey2]
   (ADD NEW KEYVALUE PAIR HERE) --> Where to put in the real CST?
 VirtualSection2
   VirtualKeyValue
 VirtualSection3
   VirtualKeyValue

[CST]
  RealSection1
    RealKey => RealValue
  RealSection1
    RealKey2 => RealValue

[CST2]
  RealSection1
    RealKey => RealValue2

What is RealSection1.RealKey?
[ RealValue, Realvale2 ]

*/

// in terms of adding a new key value pair
// it will need to look at the index and where it points to
// VirtualSection1 points to CST.RealSection1 and CST2.ReslSection1
// it then limits its operations to that
//
// the main idea instead of making changes to the CST and then syncing to the index
// we make changes to the index, and sync to the CST
// it is the index that determines how and where we can edit the CST
// so VirtualSection1 exposes capabilities to add and remove key values
// which translate to a cursor on the cst tree and changes the cst accordingly
// it feels like we would use baobab to have real cursors that allow us to navigate and change
// which means we build the CST once, and let the system build the index
// problem is the problem of inclusion trees, the index would need to be built after the CST is first created, alternatively the cursor construction relies on a path build up during parsing
// so we pass in a context path into each subrule (remember this means recursive rules are a bad idea)
// it's almost like we are building up a virtual tree to represent all of the total csts
// this tree has then 3 kinds of nodes, the top level, a section, and a leaf keyvalue, they expose operations to deal with their individual sections

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
