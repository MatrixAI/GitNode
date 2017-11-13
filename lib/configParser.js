import { Token, Lexer, Parser } from 'chevrotain';

const lexingSpec = {
  defaultMode: 'initMode',
  modes: {}
};

class WhiteSpaceT extends Token {
  static PATTERN = /\s+/;
  static GROUP = Lexer.SKIPPED;
  static LINE_BREAKS = true;
}

class LSquareT extends Token {
  static PATTERN = /\[/;
  // static POP_MODE = true;
  static PUSH_MODE = 'sectionHeaderMode';
}

class RSquareT extends Token {
  static PATTERN = /]/;
  // static POP_MODE = true;
  static PUSH_MODE = 'sectionBodyMode';
}

class SectionBodyLSquareT extends Token {
  static PATTERN = /\[/;
  static POP_MODE = true;
}

class SectionNameT extends Token {
  static PATTERN = /[0-9a-zA-Z.-]+/;
}

class SectionIncludeIfT extends Token {
  static PATTERN = /includeIf/;
  static LONGER_ALT = SectionNameT;
}

class SectionIncludeT extends Token {
  static PATTERN = /include/;
  static LONGER_ALT = SectionIncludeIfT;
}

class SubSectionNameT extends Token {
  static PATTERN = /"(?:[^\\"\n]|\\[bnt"\\])*"/;
}

class VariableT extends Token {
  static PATTERN = /[a-zA-Z][0-9a-zA-Z-]+/;
}

class EqualT extends Token {
  static PATTERN = /=/;
  // static POP_MODE = true;
  static PUSH_MODE = 'valueMode';
}

class QuotedStringT extends Token {
  static PATTERN = /"(?:[^\\"\n]|\\[bnt"\\\n])*"/;
}

class NewlineT extends Token {
  static PATTERN = /\n/;
  static POP_MODE = true;
  // static PUSH_MODE = 'sectionBodyMode';
}

lexingSpec.modes.initMode = [
  WhiteSpaceT,
  LSquareT // special initial LSquareT
];

// one way to do this is on encountering RSquareT
// is to push into sectionBodyMode
lexingSpec.modes.sectionHeaderMode = [
  WhiteSpaceT,
  RSquareT,
  SectionIncludeT,
  SectionIncludeIfT,
  SectionNameT,
  SubSectionNameT
];

// then on encountering LSquareT
// pop out of sectionBodyMode (and assume we are in sectionHeaderMode)
// this requires a different kind of LSquareT from the original
lexingSpec.modes.sectionBodyMode = [
  WhiteSpaceT,
  EqualT,
  SectionBodyLSquareT,
  VariableT
];

lexingSpec.modes.valueMode = [
  NewlineT,
  WhiteSpaceT,
  QuotedStringT
];

// a nonbackslashed newline pops out of the value mode

const lexer = new Lexer(lexingSpec, {
  debug: true
});

const result = lexer.tokenize(fs.readFileSync('./test.config', 'utf8'));

console.log(result);


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
