import fs from 'fs';
import { Lexer } from 'chevrotain';
import { lexicalGrammar } from './lib/config/ConfigLexer.js';
import ConfigParser from './lib/config/ConfigParser.js';

const lexer = new Lexer(lexicalGrammar, {
  debug: true
});

const text = fs.readFileSync('./test.config', 'utf8');
const results = lexer.tokenize(text);

console.log(results.tokens.map((token) => {
  return [token.image, token.tokenClassName];
}));

const parser = new ConfigParser([]);

parser.input = results.tokens;

parser.top();

if (parser.errors.length > 0) {
  console.log(parser.errors);
} else {
  console.log('PARSING SUCCESS');
}

// results.tokens = results.tokens.map((token) => {
//   return [token.image, token.tokenClassName];
// });

// console.log(text);
// console.log(results);
