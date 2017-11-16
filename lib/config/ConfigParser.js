// @flow
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

type key = string;
type value = string|number|boolean;
type section = Map<key, Array<value>>;
type sectionKey = string;
type config = Map<sectionKey, section>;

/*
  top    ::= (header body)*
  header ::= HeaderNameT HeaderSubNameT?
  body   ::= (key value)*
  key    ::= BodyKeyT
  value  ::= (ValueStringT | ValueSpaceT | ValueQuotedStringT)*
*/
class ConfigParser extends Parser {

  top = this.RULE('top', (map: config) => {
    this.MANY(() => {
      const headers = this.SUBRULE(this.header);
      const headerCombined = headers.join(' ').trim();
      let bodyMap = map.get(headerCombined);
      if (!bodyMap) {
        bodyMap = new Map;
        map.set(headerCombined, bodyMap);
      }
      this.SUBRULE(this.body, [bodyMap]);
    });
  });

  header = this.RULE('header', () => {
    let header;
    let headerSub;
    this.OR([
      {ALT: () => {
        header = this.CONSUME(HeaderNameT).image;
      }},
      {ALT: () => {
        header = this.CONSUME(HeaderIncludeT).image;

        // how do we run the parser recursively?
        // we would need to pass the map already created into a parser creation that involves parsing the bottom one
        // const parser = new ConfigParser;
        // parser.input = results.token
        // but you want to wrap the whole into a single function
        // OR you pass in a recursive callback

        // const text = fs.readFileSync('./config', 'utf8');
        // const lexer = new Lexer(lexicalGrammar);
        // const result = lexer.tokenize(text);
        // const parser = new ConfigParser(result.tokens, [map]);
        // it's not efficient to instantiate the same parser
        // instead refer to the old parser and wipe the input
        // however this would lose us our context in the current parser
        // so we do need to instantiate a new parser for each include
        // OH MAN this can work

        /* console.log(new ConfigParser);*/

      }},
      {ALT: () => {
        header = this.CONSUME(HeaderIncludeIfT).image;
      }}
    ]);
    this.OPTION(() => {
      headerSub = this.CONSUME(HeaderSubNameT).image.slice(1, -1);
    });
    return [header, headerSub];
  });

  body = this.RULE('body', (map: section) => {
    this.MANY(() => {
      const key = this.SUBRULE(this.key);
      let values = map.get(key);
      if (!values) {
        values = [];
        map.set(key, values);
      }
      const value = this.SUBRULE(this.value);
      values.push(value);
    });
  });

  key = this.RULE('key', () => {
    const keyToken = this.CONSUME(BodyKeyT);
    return keyToken.image;
  });

  value = this.RULE('value', () => {
    let valueString = '';
    this.MANY(() => {
      let valueLexeme;
      this.OR([
        {ALT: () => {
          const valueToken = this.CONSUME(ValueSpaceT);
          valueLexeme = valueToken.image;
        }},
        {ALT: () => {
          const valueToken = this.CONSUME(ValueStringT);
          valueLexeme = valueToken.image;
        }},
        {ALT: () => {
          const valueToken = this.CONSUME(ValueQuotedStringT);
          valueLexeme = valueToken.image.slice(1, -1);
        }}
      ]);
      valueString += valueLexeme;
    });
    return valueString;
  });

  constructor (input = [], config) {
    super(input, lexicalGrammar, config);
    Parser.performSelfAnalysis(this);
    // use map as instance variable that we are constructing with
    // top() becomes just a normal function to call
    // then we get recursion
  }

}

export default ConfigParser;

export type { config, sectionKey, section, key, value };
