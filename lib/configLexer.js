import { Token, Lexer } from 'chevrotain';

// \s without \n
const lineSpaceRegex = '[ \f\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]';

const lexingSpec = {
  defaultMode: 'initMode',
  modes: {}
};

class WhiteSpaceT extends Token {
  static PATTERN = /\s+/;
  static GROUP = Lexer.SKIPPED;
  static LINE_BREAKS = true;
}

class InitLSquareT extends Token {
  static PATTERN = /\[/;
  static PUSH_MODE = 'headerMode';
}

lexingSpec.modes.initMode = [
  WhiteSpaceT,
  InitLSquareT
];

class RSquareT extends Token {
  static PATTERN = /]/;
  static PUSH_MODE = 'bodyMode';
}

class HeaderNameT extends Token {
  static PATTERN = /[0-9a-zA-Z.-]+/;
}

class HeaderIncludeIfT extends Token {
  static PATTERN = /includeIf/;
  static LONGER_ALT = HeaderNameT;
}

class HeaderIncludeT extends Token {
  static PATTERN = /include/;
  static LONGER_ALT = HeaderNameT;
}

class HeaderSubNameT extends Token {
  static PATTERN = /"(?:[^\\"\n]|\\[bnt"\\])*"/;
}

lexingSpec.modes.headerMode = [
  WhiteSpaceT,
  RSquareT,
  HeaderIncludeIfT,
  HeaderIncludeT,
  HeaderNameT,
  HeaderSubNameT
];

class LSquareT extends Token {
  static PATTERN = /\[/;
  static POP_MODE = true;
}

// must ignore leading spaces
class BodyEqualT extends Token {
  static PATTERN = new RegExp('=' + lineSpaceRegex + '*');
  static PUSH_MODE = 'valueMode';
}

class BodyKeyT extends Token {
  static PATTERN = /[a-zA-Z][a-zA-Z0-9-]*/;
}

lexingSpec.modes.bodyMode = [
  WhiteSpaceT,
  LSquareT,
  BodyKeyT,
  BodyEqualT
];

class ValueLineContinuationT extends Token {
  static PATTERN = /\\\n/;
  static LINE_BREAKS = true;
}

class NewlineT extends Token {
  static PATTERN = /\n/;
  static POP_MODE = true;
  static LINE_BREAKS = true;
}

class ValueSpaceT extends Token {
  static PATTERN = new RegExp(lineSpaceRegex + '+');
}

class ValueTrailingSpaceT extends Token {
  static PATTERN = new RegExp(lineSpaceRegex + '+(?=\n)');
  static GROUP = Lexer.SKIPPED;
}

class ValueStringT extends Token {
  static PATTERN = /(?:[^\\"\s]|\\[bnt"\\])+/;
}

class ValueQuotedStringT extends Token {
  static PATTERN = /"(?:[^\\"\n]|\\[bnt"\\\n])*"/;
  static LINE_BREAKS = true;
}

lexingSpec.modes.valueMode = [
  ValueLineContinuationT,
  NewlineT,
  ValueTrailingSpaceT,
  ValueSpaceT,
  ValueStringT,
  ValueQuotedStringT
];

const lexer = new Lexer(lexingSpec, {
  debug: true
});

export default lexer;
