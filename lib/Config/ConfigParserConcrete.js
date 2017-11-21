import { Parser } from 'chevrotain';

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

class ConfigParser extends Parser {

  /* _interpret: ?interpret;*/
  /* _configIndex: configIndex;*/

  constructor (interpret) {
    super([], lexicalGrammar, {outputCst: true});
    /* this._interpret = interpret;*/
    Parser.performSelfAnalysis(this);
  }

  execute (input) {
    super.input = input;
    return this.top();
  }

  // top ::= (formatting header formatting body)*
  top = this.RULE('top', () => {
    console.log('HEY TOP IS CALLED');
    this.MANY(() => {
      console.log('TOP MANY IS CALLED');
      this.SUBRULE1(this.formatting);
      console.log('TOP formatting 1 IS CALLED');
      this.SUBRULE2(this.header);
      console.log('TOP header IS CALLED');
      this.SUBRULE3(this.formatting);
      console.log('TOP formatting 2 IS CALLED');
      this.SUBRULE4(this.body); // the body is now the issue
      console.log('TOP body IS CALLED');
    });
    console.log('TOP FINISH');
  });

  // formatting ::= (WhiteSpaceT? CommentT? EndOfLineT)*

  formatting = this.RULE('formatting', () => {
    this.MANY(() => {
      this.OR([
        {ALT: () => {
          this.CONSUME(WhiteSpaceT);
        }},
        {ALT: () => {
          this.CONSUME(CommentT);
        }},
        {ALT: () => {
          this.CONSUME(EndOfLineT);
        }}
      ]);
    });

    // actually you cannot have comment then no end of line
    // a comment must always have an end of line
  });

  // header ::= headerEnter HeaderNameT WhiteSpaceT? HeaderSubNameT? BodyEnterT
  header = this.RULE('header', () => {
    this.SUBRULE(this.headerEnter);
    this.CONSUME(HeaderNameT);
    this.OPTION1(() => {
      this.CONSUME(WhiteSpaceT);
    });
    this.OPTION2(() => {
      this.CONSUME(HeaderSubNameT);
    });
    this.CONSUME(BodyEnterT);
  });

  // header ::= HeaderEnterT | BodyExitT
  headerEnter = this.RULE('headerEnter', () => {
    this.OR([
      {ALT: () => {
        this.CONSUME(HeaderEnterT);
      }},
      {ALT: () => {
        this.CONSUME(BodyExitT);
      }}
    ]);
  });

  // body ::= (formatting key WhiteSpaceT? ValueEnterT value)*
  body = this.RULE('body', () => {
    console.log('WE ARE NOW IN BODY');
    this.MANY(() => {
      console.log('BODY MANY');
      this.SUBRULE1(this.formatting);
      console.log('AFTER BODY FORMAT');
      this.SUBRULE2(this.key);
      console.log('AFTER BODY KEY');
      this.OPTION(() => {
        this.CONSUME(WhiteSpaceT);
      });
      console.log('AFTER BODY WHITESPACE');
      this.CONSUME(ValueEnterT);
      console.log('AFTER BODY VALUEENTER');
      this.SUBRULE3(this.value);
      console.log('AFTER BODY VALUE');
    });
    console.log('FINISH BODY');
  });

  // key ::= BodyKeyT
  key = this.RULE('key', () => {
    this.CONSUME(BodyKeyT);
  });

  // value ::= ValueExitT
  //         | ValueLineContinuationT value
  //         | ValueSpaceT value
  //         | ValueStringT value
  //         | ValueQuotedStringT value
  value = this.RULE('value', () => {
    this.OR([
      {ALT: () => {
        this.CONSUME(ValueExitT);
      }},
      {ALT: () => {
        this.CONSUME(ValueSpaceT);
        this.SUBRULE1(this.value);
      }},
      {ALT: () => {
        this.CONSUME(ValueLineContinuationT);
        this.SUBRULE2(this.value);
      }},
      {ALT: () => {
        this.CONSUME(ValueStringT);
        this.SUBRULE3(this.value);
      }},
      {ALT: () => {
        this.CONSUME(ValueQuotedStringT);
        this.SUBRULE4(this.value);
      }}
    ]);
  });

}

export default ConfigParser;
