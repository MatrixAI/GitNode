import fs from 'fs';
import { Lexer } from 'chevrotain';
import { lexicalGrammar } from './lib/config/ConfigLexer.js';
import ConfigParser from './lib/config/ConfigParser.js';
import util from 'util';

const lexer = new Lexer(lexicalGrammar);

const text = fs.readFileSync('./test.config', 'utf8');
const results = lexer.tokenize(text);

console.log(results.tokens.map((token) => {
  return [token.image, token.type.name];
}));

const parser = new ConfigParser(results.tokens);

// reset the parser input whenever you need to rerun it again
// parser.input = results.tokens;

const map = new Map;
parser.top(undefined, [map]);

if (parser.errors.length > 0) {
  console.log(parser.errors);
} else {
  console.log([...map]);
  console.log([...map.get('section2')]);
  console.log([...map.get('section3')]);
  console.log([...map.get('section4')]);
  console.log([...map.get('section4').get('subsection')]);
  console.log([...map.get('section4 subsection')]);
  console.log([...map.get('include').get('path')]);
}

// shit this doesn't work when section4 has a subsection k => v
// while having a subsection being also a name
// you can get both in git config
// this doesn't work!!!
// one way to  change this is to flatten the map
// and to use pairs as their keys
// ES6 maps can have objects as their keys
// so if we use pairs as their keys it could also work
// then asking for section3 is equivalent to asking for [section3]
// but asking for section3.a is [section3] then a
// but asking for section3.section4 is [section3, section4]
// but how do we know if a selection is for a value in a section itself

// section1.section2 (section2) must be a key
// section1.section2.key (section2) must be a subsection
// that's how it works
// so your selection needs to work as pairs instead
// key equality in es6maps is weird though
// you have the usage of ===
// yea it won't work with array pairs
// but it could work with string pairs
// "section1"
// vs "section1 section2"

// section1.section2 => map.get("section1").get('section2')
// section1.section2.section3 => map.get("section1 section2")
// but yea exactly cause spaces not allowed in section names
// ok so we need to flatten the array instead of creating them like that

// results.tokens = results.tokens.map((token) => {
//   return [token.image, token.tokenClassName];
// });

// console.log(text);
// console.log(results);
