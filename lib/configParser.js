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
} from './configLexer.js';

class ConfigParser extends Parser {

  constructor (input, config) {
    super(input, lexicalGrammar, config);

    this.RULE('top', () => {
      this.MANY(() => {
        this.SUBRULE(this.section);
      });
    });

    this.RULE('section', () => {
      this.SUBRULE(this.header);
      this.SUBRULE(this.body);
    });

    this.RULE('header', () => {
      this.CONSUME(HeaderNameT);
      this.OR([
        {ALT: () => { this.CONSUME(HeaderNameT); }},
        {ALT: () => { this.CONSUME(HeaderIncludeT); }},
        {ALT: () => { this.CONSUME(HeaderIncludeIfT); }}
      ]);
      this.OPTION(() => {
        this.CONSUME(HeaderSubNameT);
      });
    });

    this.RULE('body', () => {
      this.MANY(() => {
        this.SUBRULE('key');
        this.SUBRULE('value');
      });
    });

    this.RULE('key', () => {
      this.CONSUME(BodyKeyT);
    });

    this.RULE('value', () => {
      this.MANY(() => {
        this.OR([
          {ALT: () => { this.CONSUME(ValueSpaceT); }},
          {ALT: () => { this.CONSUME(ValueStringT); }},
          {ALT: () => { this.CONSUME(ValueQuotedStringT); }}
        ]);
      });
    });

    Parser.performSelfAnalysis(this);
  }

}

export default ConfigParser;

// a semantic action of encountering an inclusion is recursion
// expand the inclusion and rerun the same parser on it
// this should be possible by just pointing it at a non-terminal
// however i'm not sure how to translate BNF grammars to chevrotain atm

/*

  main = (header body)+
  header = headerName (headerSubName)?
  body = (key value+)+
  value = ValueStringT | ValueSpaceT | ValueQuotedStringT

*/
