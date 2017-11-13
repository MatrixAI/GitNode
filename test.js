import fs from 'fs';
import { Token, Lexer, Parser } from 'chevrotain';

const lexingSpec = {
  defaultMode: 'topMode',
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

lexingSpec.modes.topMode = [
  WhiteSpaceT,
  LSquareT
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


// class EqualT extends Token {
//   static NAME = "EqualT";
//   static PATTERN = /=/;
// }

// class CommentT extends Token {
//   static NAME = "CommentT";
//   static PATTERN = /[#;].+/;
//   static GROUP = "singleLineComments";
// }

// class QuotedStringT extends Token {
//   static NAME = "QuotedStringT";
//   static PATTERN = /"(?:[^\\"\n]|\\[bnt"\\\n])*"/;
// }

// // alphanumeic string
// class IdentifierT extends Token {
//   static NAME = "IdentifierT";
//   static PATTERN = /[0-9a-zA-Z.-]+/;
// }

// class StringT extends Token {
//   static NAME = "StringT";
//   static PATTERN = /(?:[^\\"\n]|\\[bnt"\\])+/;
// }

// // in the order of most specific to least specific
// const lexer = new Lexer({


// });

// the chevrotain lexer is stateless, only a single one per grammar should be created
// how do i create contextual lexers, do we use lexing groups in some way?
