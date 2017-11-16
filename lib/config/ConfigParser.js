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

  _map: config;

  constructor (
    interpret,
    config
  ) {
    super([], lexicalGrammar, config);
    this._interpret = interpret;
    Parser.performSelfAnalysis(this);
  }

  parse (input, map = new Map) {
    this._map = map;
    super.input = input;
    super.SUBRULE(this.top, [map]);
    return map;
  }

  top = super.RULE('top', (map) => {
    super.MANY(() => {
      const headers = super.SUBRULE(this.header);
      const headerCombined = headers.join(' ').trim();
      let bodyMap = map.get(headerCombined);
      if (!bodyMap) {
        bodyMap = new Map;
        map.set(headerCombined, bodyMap);
      }
      super.SUBRULE(this.body, [bodyMap]);
      // we need to know if the header is a HeaderIncludeT
      // if so, any path within it needs to be processed
      // note that the value string of the path
      // will be looked up as an actual path
      // also how does git config deal with missing or failed paths?
      // suppose its a parse failure
      // so what we would need to do is to make sure that the body subrule knows that
      // note that path expansion means... it must in-order right?
      // so within the current section, we call the next portion
      // for every path that is used
      // interpret (path, this._map)
      // oh yea, and also the map totally needs to be available to each method, since currently only the current map context is passed in
      // so having _map is good, as you can then refer to it
      // the entire map as the parser is recalled

    });
  });

  header = super.RULE('header', () => {
    let header;
    let headerSub;
    super.OR([
      {ALT: () => {
        header = super.CONSUME(HeaderNameT).image;
      }},
      {ALT: () => {
        header = super.CONSUME(HeaderIncludeT).image;
      }},
      {ALT: () => {
        header = super.CONSUME(HeaderIncludeIfT).image;
      }}
    ]);
    super.OPTION(() => {
      headerSub = super.CONSUME(HeaderSubNameT).image.slice(1, -1);
    });
    return [header, headerSub];
  });

  body = super.RULE('body', (map: section) => {
    super.MANY(() => {
      const key = super.SUBRULE(this.key);
      let values = map.get(key);
      if (!values) {
        values = [];
        map.set(key, values);
      }
      const value = super.SUBRULE(this.value);
      values.push(value);
    });
  });

  key = super.RULE('key', () => {
    const keyToken = super.CONSUME(BodyKeyT);
    return keyToken.image;
  });

  value = super.RULE('value', () => {
    let valueString = '';
    super.MANY(() => {
      let valueLexeme;
      super.OR([
        {ALT: () => {
          const valueToken = super.CONSUME(ValueSpaceT);
          valueLexeme = valueToken.image;
        }},
        {ALT: () => {
          const valueToken = super.CONSUME(ValueStringT);
          valueLexeme = valueToken.image;
        }},
        {ALT: () => {
          const valueToken = super.CONSUME(ValueQuotedStringT);
          valueLexeme = valueToken.image.slice(1, -1);
        }}
      ]);
      valueString += valueLexeme;
    });
    return valueString;
  });

}

export default ConfigParser;

export type { config, sectionKey, section, key, value };
