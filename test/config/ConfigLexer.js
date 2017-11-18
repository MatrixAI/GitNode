import test from 'ava';
import { Lexer } from 'chevrotain';
import { stripIndent } from 'common-tags';
import {
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
} from '../../lib/config/ConfigLexer.js';

// note that stripIndent will strip all indentation until the leftmost text
// this is important for testing whitespace capture

// tokenClassName may need to be changed in the latest version
function tokenFilter (token) {
  return [token.image, token.type];
}

const lexer = new Lexer(lexicalGrammar);

test('section headers', t => {
  let text;
  let result;
  text = stripIndent`
    [section]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT]
    ]
  );
  text = stripIndent`
    [123]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['123', HeaderNameT],
      [']', BodyEnterT]
    ]
  );
  text = stripIndent`
    [1a2b3c]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['1a2b3c', HeaderNameT],
      [']', BodyEnterT]
    ]
  );
  text = stripIndent`
    [section-name]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section-name', HeaderNameT],
      [']', BodyEnterT]
    ]
  );
  text = stripIndent`
    [section.name]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section.name', HeaderNameT],
      [']', BodyEnterT]
    ]
  );
  // indentation is not allowed
  text = stripIndent`
    [a
    b
    c]
  `;
  result = lexer.tokenize(text);
  t.truthy(result.errors);
});

test('subsection headers', t => {
  let text;
  let result;
  text = stripIndent`
    [section "subsection"]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      ['"subsection"', HeaderSubNameT],
      [']', BodyEnterT]
    ]
  );
  text = stripIndent`
    [section "su\\n\\b \\"sub\\" s\\tub"]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      ['"su\\n\\b \\"sub\\" s\\tub"', HeaderSubNameT],
      [']', BodyEnterT]
    ]
  );
  // indentation is not allowed
  text = stripIndent`
    [section "a
    b
    c"]
  `;
  result = lexer.tokenize(text);
  t.truthy(result.errors);
});

test('section include and includeIf header', t => {
  let text;
  let result;
  text = stripIndent`
    [include]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['include', HeaderIncludeT],
      [']', BodyEnterT]
    ]
  );
  text = stripIndent`
    [includeIf]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['includeIf', HeaderIncludeIfT],
      [']', BodyEnterT]
    ]
  );
});

test('body variable key to value', t => {
  let text;
  let result;
  text = stripIndent`
    [section]
      v = r
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v', BodyKeyT],
      ['= ', ValueEnterT],
      ['r', ValueStringT]
    ]
  );
  text = stripIndent`
    [section]
      v = "r"
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v', BodyKeyT],
      ['= ', ValueEnterT],
      ['"r"', ValueQuotedStringT]
    ]
  );
  text = stripIndent`
    [section]
      v1 = 1
      v2 = 2
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v1', BodyKeyT],
      ['= ', ValueEnterT],
      ['1', ValueStringT],
      ['v2', BodyKeyT],
      ['= ', ValueEnterT],
      ['2', ValueStringT]
    ]
  );
  text = stripIndent`
    [section]
      v = a b c
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v', BodyKeyT],
      ['= ', ValueEnterT],
      ['a', ValueStringT],
      [' ', ValueSpaceT],
      ['b', ValueStringT],
      [' ', ValueSpaceT],
      ['c', ValueStringT]
    ]
  );
  text = stripIndent`
    [section]
      v = a \\
          b \\
          c
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v', BodyKeyT],
      ['= ', ValueEnterT],
      ['a', ValueStringT],
      [' ', ValueSpaceT],
      ['      ', ValueSpaceT],
      ['b', ValueStringT],
      [' ', ValueSpaceT],
      ['      ', ValueSpaceT],
      ['c', ValueStringT]
    ]
  );
  text = stripIndent`
    [section]
      v = "a \\
           b \\
           c"
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v', BodyKeyT],
      ['= ', ValueEnterT],
      ['"a \\\n       b \\\n       c"', ValueQuotedStringT]
    ]
  );
});

test('comments', t => {
  let text;
  let result;
  text = stripIndent`
    ; first commment
    [section] ; second comment
    ; third comment
      v = "a \\
           b \\
           c" ; fourth comment
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v', BodyKeyT],
      ['= ', ValueEnterT],
      ['"a \\\n       b \\\n       c"', ValueQuotedStringT]
    ]
  );

});

test('trailing whitespace', t => {
  let text;
  let result;
  // don't let your editor remove the bottom spaces!
  text = stripIndent`
    [section]
      v = a

  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT],
      [']', BodyEnterT],
      ['v', BodyKeyT],
      ['= ', ValueEnterT],
      ['a', ValueStringT],
    ]
  );
});
