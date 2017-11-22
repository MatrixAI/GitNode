// we need to try with the CST again with no hidden nodes so we can figure out how to directly mutate the text without changing things

// note that CST based on lexer tokens none of which are hidden anymore, so all things are saved

import fs from 'fs';

import {
  configLexer,
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
} from './lib/Config/ConfigLexer.js';

import ConfigParser from './lib/Config/ConfigParserConcrete.js';


const lexingResult = configLexer.tokenize(fs.readFileSync('./config', 'utf8'));

const outputTokens = lexingResult.tokens.map((token) => {
  return [token.image, token.type.tokenName];
});

fs.writeFileSync('./configtokens', JSON.stringify(outputTokens, null, 2));

const parser = new ConfigParser;

const index = new Map;
const tags = new WeakMap;
const parserResult = parser.execute(lexingResult.tokens, index, tags);

fs.writeFileSync('./configparser', JSON.stringify(parserResult, null, 2));

console.log(parserResult);

console.log([...index]);

// console.log(tags);

// now we have the index
// and let's assume we are asked to get a particular value
// section1.key1

const cursor = index.get('section1.key1')[0];

// this allows us to know which root CST a cursor is part of
console.log(cursor);
console.log(tags.has(cursor));
console.log(tags.get(cursor));

// now what we need to do is basically
// use this cursor to get the actual value
// we have 2 kinds of cursors here
// section cursors
// keyvalue cursors
// section cursors allow us to add and remove key values
// keyvalue cursors allow us to get and set values of a key
// remember adding new values or removing values is about a section
// and that section must exist already
// removing keys/values from the section
// in the future, moving the cursor creation into a tree indexing phase
// so the tree created, then passed into tree visitor system
// that produces the curtom cursors that we want to work with


// if you do something like this
// config.set([section1, key], value)
// it will look up section1 in the configIndex
// this should point to the section within the CST
// and if it doesn't exist, create an new section in the local CST
// and return a reference to that section
// similarly
// config.set([section, subsection, key])
// it looks up section.subsection
// which should point to another section in the tree
// which should then allow us to set key values
// depending on whether an existing one exists or not
// SO that means, on get, it's always working against a "section"
// and that on SET, it also works against a "section"

// on GET, you look at the entire CST graph
// on SET, you only look at the local CST graph
