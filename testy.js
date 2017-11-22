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
const parserResult = parser.execute(lexingResult.tokens, index);

fs.writeFileSync('./configparser', JSON.stringify(parserResult, null, 2));

console.log(parserResult);

console.log([...index]);


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
