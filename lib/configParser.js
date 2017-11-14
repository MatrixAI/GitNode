import { Parser } from 'chevrotain';
import lexer from './configLexer.js';

// i have an idea how to make this work
// you have the starting state
// and this has whitespacet and [ which transitions (pushes)
// to section header mode
// after ], it pushes into section body mode
// if in section body mode it encounters [
// then it pops out (thus into section header mode)
// if it encounters a variable and then =
// then it pushes into value mode
// once value encounters \n, then it pops out into section body mode
// section header <-> (transit by []) section body  <-> (transit by \n) value
// should make this a diagram

class ConfigParser extends Parser {
  constructor (input) {
    super(input, allTokens);
    // main entry rule (non-terminal)
    this.RULE('config', () => {


      // parse section names first
      // so we have a section and potential subsection
      // within it, we have various key = value entries
      // but also we need semantic actions for inclusions, which we need to expand in order
      // so we can continue parsing?


    });

    this.RULE('section', () => {

      // does the existence of this allow the possibility of subsection as well?

    });



    Parser.performSelfAnalysis(this);

    // a semantic action of encountering an inclusion is recursion
    // expand the inclusion and rerun the same parser on it
    // this should be possible by just pointing it at a non-terminal
    // however i'm not sure how to translate BNF grammars to chevrotain atm
  }
}

const parser = new ConfigParser([]);

// lexResult = lexer.tokenize(string)
// parser.input = lexResult.tokens
// parser.config()
// return { lexResult.errors, parser.errors, value: value };
