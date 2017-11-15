import { Parser } from 'chevrotain';
import {
  HeaderNameT,
  HeaderIncludeIfT,
  HeaderIncludeT,
  HeaderSubNameT,
  BodyKeyT,
  ValueLineContinuationT,
  ValueSpaceT,
  ValueStringT,
  ValueQuotedStringT,
  lexicalGrammar
} from './ConfigLexer.js';

/*
  main    ::= (section)*
  section :: = header body
  header  ::= HeaderNameT HeaderSubNameT?
  body    ::= (key value)*
  key     ::= BodyKeyT
  value   ::= (ValueStringT | ValueSpaceT | ValueQuotedStringT)*
*/
class ConfigParser extends Parser {

  top = this.RULE('top', () => {
    this.MANY(() => {
      this.SUBRULE(this.section);
    });
  });

  section = this.RULE('section', () => {
    this.SUBRULE(this.header);
    this.SUBRULE(this.body);
  });

  header = this.RULE('header', () => {
    this.OR([
      {ALT: () => { this.CONSUME(HeaderNameT); }},
      {ALT: () => { this.CONSUME(HeaderIncludeT); }},
      {ALT: () => { this.CONSUME(HeaderIncludeIfT); }}
    ]);
    this.OPTION(() => {
      this.CONSUME(HeaderSubNameT);
    });
  });

  body = this.RULE('body', () => {
    this.MANY(() => {
      this.SUBRULE(this.key);
      this.SUBRULE(this.value);
    });
  });

  key = this.RULE('key', () => {
    this.CONSUME(BodyKeyT);
  });

  value = this.RULE('value', () => {
    this.MANY(() => {
      this.OR([
        {ALT: () => { this.CONSUME(ValueSpaceT); }},
        {ALT: () => { this.CONSUME(ValueStringT); }},
        {ALT: () => { this.CONSUME(ValueQuotedStringT); }}
      ]);
    });
  });

  constructor (input, config) {
    super(input, lexicalGrammar, config);
    Parser.performSelfAnalysis(this);
  }

}

export default ConfigParser;
