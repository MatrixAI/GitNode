import test from 'ava';
import { stripIndent } from 'common-tags';
import { configLexer } from '../../lib/config/ConfigLexer.js';
import ConfigParser from '../../lib/config/ConfigParser.js';

test('parsing key to value', t => {
  const map = new Map;
  const text = stripIndent`
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

test('double quotes are removed from quoted values', t => {
  const map = new Map;
  const text = stripIndent`
    [section]
      v = "a \\
           b \\
           c"
  `;
  const tokens = configLexer.tokenize(text).tokens;
  const parser = new ConfigParser;
  parser.execute(tokens, map);
  t.deepEqual(
    [...map.get('section')],
    [
      ['v', ['a \\\n       b \\\n       c']]
    ]
  );
});

test('parsing with comments', t => {
  const map = new Map;
  const text = stripIndent`
    [section]
      k = v
  `;
  const tokens = configLexer.tokenize(text).tokens;
  const parser = new ConfigParser;
  parser.execute(tokens, map);
  t.deepEqual(
    [...map.get('section')],
    [
      ['k', ['v']]
    ]
  );
});

test('parsing multivalued keys', t => {
  const map = new Map;
  const text = stripIndent`
    [section]
      key = value1
      key = value2
    [section]
      key = value3
  `;
  const tokens = configLexer.tokenize(text).tokens;
  const parser = new ConfigParser;
  parser.execute(tokens, map);
  t.deepEqual(
    [...map.get('section')],
    [
      ['key', ['value1', 'value2', 'value3']],
    ]
  );
});

test('parsing subsections', t => {
  const map = new Map;
  const text = stripIndent`
    [section "subsection"]
      key = value1
    [section "subsection"]
      key = value2
  `;
  const tokens = configLexer.tokenize(text).tokens;
  const parser = new ConfigParser;
  parser.execute(tokens, map);
  t.deepEqual(
    [...map.get('section subsection')],
    [
      ['key', ['value1', 'value2']],
    ]
  );
});

test('parsing spaces between values', t => {
  const map = new Map;
  const text = stripIndent`
    [section "subsection"]
      key = value1  "value2"  value3   
  `;
  const tokens = configLexer.tokenize(text).tokens;
  const parser = new ConfigParser;
  parser.execute(tokens, map);
  t.deepEqual(
    [...map.get('section subsection')],
    [
      ['key', ['value1  value2  value3']],
    ]
  );
});
