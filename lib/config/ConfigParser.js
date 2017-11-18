// @flow

import { Parser, tokenMatcher } from 'chevrotain';

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

type token = Object;
type key = string;
type value = string|boolean;
type section = Map<key, Array<value>>;
type sectionKey = string;
type config = Map<sectionKey, section>;
type path = string;
type interpret = (path, config, ?number, ?string) => config;

/*
  top    ::= (header body)*
  header ::= HeaderNameT HeaderSubNameT?
  body   ::= (key value)*
  key    ::= BodyKeyT
  value  ::= (ValueStringT | ValueSpaceT | ValueQuotedStringT)*
*/
class ConfigParser extends Parser {

  _interpret: ?interpret;
  _limit: ?number;
  _map: config;

  constructor (interpret: ?interpret, limit: ?number, parserOptions: ?Object) {
    super([], lexicalGrammar, parserOptions);
    this._interpret = interpret;
    this._limit = limit;
    Parser.performSelfAnalysis(this);
  }

  execute (input: Array<token>, map: config): void {
    this._map = map;
    super.input = input;
    super.SUBRULE(this.top, [map]);
  }

  top = this.RULE('top', (map): void => {
    this.MANY(() => {
      const [header, headerSub]= this.SUBRULE(this.header);
      let head = header.image;
      if (headerSub) {
        head += ' ' + headerSub.image;
      }
      let bodyMap = map.get(head);
      if (!bodyMap) {
        bodyMap = new Map;
        map.set(head, bodyMap);
      }
      if (tokenMatcher(header, HeaderIncludeT)) {
        this.SUBRULE1(this.body, [bodyMap, true]);
      } else if (tokenMatcher(header, HeaderIncludeIfT) && headerSub) {
        // inclusion only occurs if headerSub (as the condition) also exists
        this.SUBRULE2(this.body, [bodyMap, true, headerSub.image]);
      } else {
        this.SUBRULE3(this.body, [bodyMap]);
      }
    });
  });

  header = this.RULE('header', (): [token, ?token] => {
    let header;
    let headerSub;
    this.OR([
      {ALT: () => {
        header = this.CONSUME(HeaderNameT);
      }},
      {ALT: () => {
        header = this.CONSUME(HeaderIncludeT);
      }},
      {ALT: () => {
        header = this.CONSUME(HeaderIncludeIfT);
      }}
    ]);
    this.OPTION(() => {
      headerSub = this.CONSUME(HeaderSubNameT);
      // trim the double quotes
      headerSub.image = headerSub.image.slice(1, -1);
    });
    // $FlowFixMe: header is filled
    return [header, headerSub];
  });

  body = this.RULE(
    'body',
    (
      map: section,
      inclusion: boolean = false,
      condition: ?string = null
    ): void => {
      this.MANY(() => {
        const key = this.SUBRULE(this.key);
        let values = map.get(key.image);
        if (!values) {
          values = [];
          map.set(key.image, values);
        }
        const value = this.SUBRULE(this.value);
        const valueString = value.map((token) => token.image).join('');
        values.push(valueString);
        if (this._interpret && inclusion && key.image === 'path') {
          this._interpret(valueString, this._map, this._limit, condition);
        }
      });
    }
  );

  key = this.RULE('key', (): token => {
    return this.CONSUME(BodyKeyT);
  });

  value = this.RULE('value', (): Array<token> => {
    let values = [];
    this.MANY(() => {
      let value;
      this.OR([
        {ALT: () => {
          value = this.CONSUME(ValueSpaceT);
        }},
        {ALT: () => {
          value = this.CONSUME(ValueStringT);
        }},
        {ALT: () => {
          value = this.CONSUME(ValueQuotedStringT);
          // trim the quotes
          value.image = value.image.slice(1, -1);
        }}
      ]);
      values.push(value);
    });
    // $FlowFixMe: values is filled
    return values;
  });

}

export default ConfigParser;

export type {
  interpret,
  path,
  config,
  sectionKey,
  section,
  key,
  value
};
