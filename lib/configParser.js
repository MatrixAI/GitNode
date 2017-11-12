import { Token, Lexer, Parser } from 'chevrotain';

class SpaceT extends Token {
  static PATTERN = / /;
}

class WhiteSpaceT extends Token {
  static PATTERN = /\s+/;
  static GROUP = Lexer.SKIPPED;
  static LINE_BREAKS = true;
}

class LSquareT extends Token {
  static PATTERN = /\[/;
}

class RSquareT extends Token {
  static PATTERN = /]/;
}

class EqualT extends Token {
  static PATTERN = /=/;
}

class CommentT extends Token {
  static PATTERN = /[#;].*$/;
}

// alphanumeric and - and .
class SectionNameT extends Token {
  static PATTERN = /[0-9a-zA-Z.-]+/;
}

// quoted string with no newlines
class SubSectionNameT extends Token {
  static PATTERN = /"(?:[^\\"\n]|\\[bnt"\\])*"/;
}

// alphanumeric with -, but must start with alphabetical
class VariableT extends Token {
  static PATTERN = /[a-z][0-9a-zA-Z-]+/;
}

// string with no space separation with \b, \n \t \\ \"
class ValueStringT extends Token {
  static PATTERN = /(?:[^\\"\n]|\\[bnt"\\\n])*/;
}

// value string with quotes
class ValueStringQuotedT extends Token {
  static PATTERN = /"(?:[^\\"\n]|\\[bnt"\\\n])*"/;
}

const allTokens = [
  SpaceT,
  WhiteSpaceT,
  LSquareT,
  RSquareT,
  EqualT,
  CommentT,
  SectionNameT,
  SubSectionNameT,
  VariableT,
  ValueStringT,
  ValueStringQuotedT
];

const lexer = new Lexer(allTokens);

class ConfigParser extends Parser {
  constructor (input) {
    super(input, allTokens);

  }
}

const parser = new ConfigParser([]);

// lexResult = lexer.tokenize(string)
// parser.input = lexResult.tokens
// parser.config()
// return { lexResult.errors, parser.errors, value: value };
