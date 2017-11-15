import test from 'ava';
import { Lexer } from 'chevrotain';
import { stripIndent } from 'common-tags';
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
} from '../lib/config/ConfigLexer.js';

// note that stripIndent will strip all indentation until the leftmost text
// this is important for testing whitespace capture

// tokenClassName may need to be changed in the latest version
function tokenFilter (token) {
  return [token.image, token.tokenClassName];
}

const lexer = new Lexer(lexicalGrammar, {debug: true});

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
      ['section', HeaderNameT.name]
    ]
  );
  text = stripIndent`
    [123]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['123', HeaderNameT.name]
    ]
  );
  text = stripIndent`
    [1a2b3c]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['1a2b3c', HeaderNameT.name]
    ]
  );
  text = stripIndent`
    [section-name]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section-name', HeaderNameT.name]
    ]
  );
  text = stripIndent`
    [section.name]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section.name', HeaderNameT.name]
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
      ['section', HeaderNameT.name],
      ['"subsection"', HeaderSubNameT.name]
    ]
  );
  text = stripIndent`
    [section "su\\n\\b \\"sub\\" s\\tub"]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['section', HeaderNameT.name],
      ['"su\\n\\b \\"sub\\" s\\tub"', HeaderSubNameT.name]
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
      ['include', HeaderIncludeT.name],
    ]
  );
  text = stripIndent`
    [includeIf]
  `;
  result = lexer.tokenize(text);
  t.deepEqual(
    result.tokens.map(tokenFilter),
    [
      ['includeIf', HeaderIncludeIfT.name],
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
      ['section', HeaderNameT.name],
      ['v', BodyKeyT.name],
      ['r', ValueStringT.name]
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
      ['section', HeaderNameT.name],
      ['v', BodyKeyT.name],
      ['"r"', ValueQuotedStringT.name]
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
      ['section', HeaderNameT.name],
      ['v1', BodyKeyT.name],
      ['1', ValueStringT.name],
      ['v2', BodyKeyT.name],
      ['2', ValueStringT.name]
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
      ['section', HeaderNameT.name],
      ['v', BodyKeyT.name],
      ['a', ValueStringT.name],
      [' ', ValueSpaceT.name],
      ['b', ValueStringT.name],
      [' ', ValueSpaceT.name],
      ['c', ValueStringT.name]
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
      ['section', HeaderNameT.name],
      ['v', BodyKeyT.name],
      ['a', ValueStringT.name],
      [' ', ValueSpaceT.name],
      ['      ', ValueSpaceT.name],
      ['b', ValueStringT.name],
      [' ', ValueSpaceT.name],
      ['      ', ValueSpaceT.name],
      ['c', ValueStringT.name]
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
      ['section', HeaderNameT.name],
      ['v', BodyKeyT.name],
      ['"a \\\n       b \\\n       c"', ValueQuotedStringT.name]
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
      ['section', HeaderNameT.name],
      ['v', BodyKeyT.name],
      ['"a \\\n       b \\\n       c"', ValueQuotedStringT.name]
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
      ['section', HeaderNameT.name],
      ['v', BodyKeyT.name],
      ['a', ValueStringT.name],
    ]
  );
});
