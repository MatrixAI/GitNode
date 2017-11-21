import typeof { Token as TokenConstructor } from 'chevrotain';

import { Parser, EOF } from 'chevrotain';

// should really use import * from ...
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

/* function createValueProxy (csts: Array<cst>, cstIndex: number, zipOps: Array<Function>) {
 *
 *   // cst becomes a hidden closure variable
 *   // the CSTProxy becomes the primary object to interact with
 *   // the entire thing produces a "virtual value"
 *   // when mutated it will change itself
 *   // each value proxy will need to point to a particular tree
 *   // not all trees will supply a value proxy
 *   // value proxies will tell you which tree they are part of
 *   class ValueProxy {
 *     change () {
 *       // change the value of the underlying CST
 *       // since you can use zippers as a cursor into the tree
 *       // thus allowing you to maintain a position and rework the tree
 *       // do you get to work with the main body of the tree
 *       // where the tree is the same everywhere?
 *       // no right, cause it's not shared
 *       // you cannot share the tree with other systems
 *       // you can with just still objects
 *       // look you can change values
 *       // it's functional, we cannot share the same tree
 *       // DAMN
 *       // unless... you keep a reference to the array containing the tree
 *       // produce a new tree, and mutate that array
 *     }
 *     stringOf () {
 *       return cst.stringOf();
 *     }
 *     valueOf () {
 *       return cst.valueOf();
 *     }
 *   }
 *   return new CSTProxy;
 * }*/

// the CST will be this
// it will be a like a rose tree
// leaf node is simply Token

// this means you could have an empty body as well
type TokenInstance = { image: string, type: TokenConstructor };
type CST = TokenInstance | { name: string, children: Array<CST> };

function push (container, value) {
  if (value) {
    container.push(value);
  }
}

class ConfigParser extends Parser {

  /* _interpret: ?interpret;*/
  /* _configIndex: configIndex;*/

  constructor (interpret) {
    super([], lexicalGrammar);
    /* this._interpret = interpret;*/
    Parser.performSelfAnalysis(this);
  }

  execute (input): CST {
    super.input = input;
    return this.top();
  }

  exampleRule = this.RULE('exampleRule', () => {
    return this.OPTION(() => {
      return this.SUBRULE(this.exampleRule2);
    });
  });

  exampleRule2 = this.RULE('exampleRule2', () => {
    this.CONSUME(HeaderEnterT);
  });

  // top ::= (formatting? section?)* EOF
  top = this.RULE('top', (): CST => {
    console.log('TOP');
    const cst = {
      name: 'top',
      children: []
    };
    this.MANY(() => {
      console.log('TOP MANY'); // infinite loop here

      push(
        cst.children,
        this.OPTION1(() => {
          console.log('TOP FORMATTING');
          // note that even if this rule is optional
          // it still returns something!?
          return this.SUBRULE1(this.formatting);
        });
      );

      push(
        cst.children,
        this.OPTION2(() => {
          console.log('TOP SECTION');
          return this.SUBRULE2(this.section);
        })
      );

    });
    console.log('TOP EOF');
    cst.children.push(this.CONSUME(EOF));
    return cst;
  });

  // formatting ::= (WhiteSpaceT | CommentT | EndOfLineT)+
  formatting = this.RULE('formatting', (): CST => {
    console.log('FORMATTING');
    const cst = {
      name: 'formatting',
      children: []
    };
    this.AT_LEAST_ONE(() => {
      this.OR([
        {ALT: () => {
          cst.children.push(this.CONSUME(WhiteSpaceT));
        }},
        {ALT: () => {
          cst.children.push(this.CONSUME(CommentT));
        }},
        {ALT: () => {
          cst.children.push(this.CONSUME(EndOfLineT));
        }}
      ]);
    });
    return cst;
  });

  // section ::= header formatting? body?
  section = this.RULE('section', (): CST => {
    const cst = {
      name: 'section',
      children: []
    };
    cst.children.push(this.SUBRULE1(this.header));
    this.OPTION1(() => {
      cst.children.push(this.SUBRULE2(this.formatting));
    });
    this.OPTION2(() => {
      cst.children.push(this.SUBRULE3(this.body));
    });
    return cst;
  });

  // header ::= headerEnter HeaderNameT WhiteSpaceT? HeaderSubNameT? BodyEnterT
  header = this.RULE('header', (): CST => {
    const cst = {
      name: 'header',
      children: []
    };
    cst.children.push(this.SUBRULE(this.headerEnter));
    cst.children.push(this.CONSUME(HeaderNameT));
    this.OPTION1(() => {
      cst.children.push(this.CONSUME(WhiteSpaceT));
    });
    this.OPTION2(() => {
      cst.children.push(this.CONSUME(HeaderSubNameT));
    });
    cst.children.push(this.CONSUME(BodyEnterT));
    return cst;
  });

  // header ::= HeaderEnterT | BodyExitT
  headerEnter = this.RULE('headerEnter', (): CST => {
    const cst = {
      name: 'headerEnter',
      children: []
    };
    this.OR([
      {ALT: () => {
        cst.children.push(this.CONSUME(HeaderEnterT));
      }},
      {ALT: () => {
        cst.children.push(this.CONSUME(BodyExitT));
      }}
    ]);
    return cst;
  });

  // body ::= (key WhiteSpaceT? ValueEnterT value ValueExitT? formatting?)*
  body = this.RULE('body', (): CST => {
    const cst = {
      name: 'body',
      children: []
    };
    this.MANY(() => {
      cst.children.push(this.SUBRULE2(this.key));
      this.OPTION1(() => {
        cst.children.push(this.CONSUME(WhiteSpaceT));
      });
      cst.children.push(this.CONSUME(ValueEnterT));
      cst.children.push(this.SUBRULE3(this.value));
      this.OPTION2(() => {
        cst.children.push(this.SUBRULE4(formatting));
      });
      this.OPTION3(() => {
        cst.children.push(this.CONSUME(ValueExitT));
      });
    });
    return cst;
  });

  // key ::= BodyKeyT
  key = this.RULE('key', (): CST => {
    const cst = {
      name: 'key',
      children: []
    };
    cst.children.push(this.CONSUME(BodyKeyT));
    return cst;
  });

  // value ::= (ValueLineContinuationT | ValueSpaceT | ValueStringT | ValueQuotedStringT)*
  value = this.RULE('value', (): CST => {
    const cst = {
      name: 'value',
      children: []
    };
    this.MANY(() => {
      this.OR([
        {ALT: () => {
          cst.children.push(this.CONSUME(ValueSpaceT));
        }},
        {ALT: () => {
          cst.children.push(this.CONSUME(ValueLineContinuationT));
        }},
        {ALT: () => {
          cst.children.push(this.CONSUME(ValueStringT));
        }},
        {ALT: () => {
          cst.children.push(this.CONSUME(ValueQuotedStringT));
        }}
      ]);
    });
    return cst;
  });

}

export default ConfigParser;
