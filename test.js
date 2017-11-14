import fs from 'fs';
import { Lexer } from 'chevrotain';
import lexingGrammar from './lib/configLexer.js';

const lexer = new Lexer(lexingGrammar, {
  debug: true
});

const text = fs.readFileSync('./test.config', 'utf8');
const results = lexer.tokenize(text);

results.tokens = results.tokens.map((token) => {
  return [token.image, token.tokenClassName];
});

console.log(text);
console.log(results);

// class CommentT extends Token {
//   static NAME = "CommentT";
//   static PATTERN = /[#;].+/;
//   static GROUP = "singleLineComments";
// }
