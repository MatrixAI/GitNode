import { Token, Lexer } from 'chevrotain';

const lexicalGrammar = {
  defaultMode: 'initMode',
  modes: {
    initMode: [],
    headerMode: [],
    bodyMode: [],
    valueMode: []
  }
};

class WhiteSpaceT extends Token {
  static PATTERN = /[^\S\r\n]+/;
  // static GROUP = Lexer.SKIPPED;
}

class EndOfLineT extends Token {
  static PATTERN = /(?:\r\n|\n)+/;
  static LINE_BREAKS = true;
  // static GROUP = Lexer.SKIPPED;
}

class CommentT extends Token {
  static PATTERN = /[#;].*/;
  // static GROUP = Lexer.SKIPPED;
}

class HeaderEnterT extends Token {
  static PATTERN = /\[/;
  static PUSH_MODE = 'headerMode';
  // static GROUP = Lexer.SKIPPED;
}

lexicalGrammar.modes.initMode = [
  WhiteSpaceT,
  EndOfLineT,
  CommentT,
  HeaderEnterT
];

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
  static PATTERN = /"(?:[^\\"\r\n]|\\[bnt"\\])*"/;
}

class BodyEnterT extends Token {
  static PATTERN = /]/;
  static PUSH_MODE = 'bodyMode';
}

lexicalGrammar.modes.headerMode = [
  WhiteSpaceT,
  HeaderIncludeIfT,
  HeaderIncludeT,
  HeaderNameT,
  HeaderSubNameT,
  BodyEnterT
];

class BodyExitT extends Token {
  static PATTERN = /\[/;
  static POP_MODE = true;
  // static GROUP = Lexer.SKIPPED;
}

class BodyKeyT extends Token {
  static PATTERN = /[a-zA-Z][a-zA-Z0-9-]*/;
}

class ValueEnterT extends Token {
  static PATTERN = /=[^\S\r\n]*/;
  static PUSH_MODE = 'valueMode';
}

lexicalGrammar.modes.bodyMode = [
  WhiteSpaceT,
  EndOfLineT,
  CommentT,
  BodyExitT,
  BodyKeyT,
  ValueEnterT
];

class ValueLineContinuationT extends Token {
  static PATTERN = /(?:\\\r\n|\\\n)/;
  static LINE_BREAKS = true;
  // static GROUP = Lexer.SKIPPED;
}

class ValueExitT extends Token {
  static PATTERN = /(?:\r\n|\n)+/;
  static POP_MODE = true;
  static LINE_BREAKS = true;
  // static GROUP = Lexer.SKIPPED;
}

class ValueSpaceT extends Token {
  static PATTERN = /[^\S\r\n]+(?=\b|"|\\)/;
}

class ValueStringT extends Token {
  static PATTERN = /(?:[^\\"\s]|\\[bnt"\\])+/;
}

class ValueQuotedStringT extends Token {
  static PATTERN = /"(?:[^\\"\r\n]|\\(?:\r\n|[bnt"\\\n]))*"/;
  static LINE_BREAKS = true;
}

lexicalGrammar.modes.valueMode = [
  CommentT,
  ValueSpaceT,
  WhiteSpaceT,
  ValueLineContinuationT,
  ValueExitT,
  ValueStringT,
  ValueQuotedStringT
];

const configLexer = new Lexer(lexicalGrammar);

export {
  configLexer,
  HeaderNameT,
  HeaderIncludeIfT,
  HeaderIncludeT,
  HeaderSubNameT,
  BodyEnterT,
  BodyKeyT,
  ValueEnterT,
  ValueLineContinuationT,
  ValueSpaceT,
  ValueStringT,
  ValueQuotedStringT,
  lexicalGrammar
};
