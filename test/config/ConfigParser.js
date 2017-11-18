import test from 'ava';
import { Lexer } from 'chevrotain';
import { stripIndent } from 'common-tags';
import { configLexer } from '../../lib/config/ConfigLexer.js';
import ConfigParser from '../../lib/config/ConfigParser.js';

test('parsing key to value', t => {
  let text;
  const map = new Map;
  text = stripIndent`
    [section]
      key1 = value1
      key2 = value2
  `;
  const tokens = configLexer.tokenize(text).tokens;
  const parser = new ConfigParser;
  parser.execute(tokens, map);
  t.deepEqual(
    [...map.get('section')],
    [
      ['key1', ['value1']],
      ['key2', ['value2']]
    ]
  );
});
