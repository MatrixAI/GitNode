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

const parserResult = parser.execute(lexingResult.tokens);

fs.writeFileSync('./configparser', JSON.stringify(parserResult, null, 2));

console.log(parserResult);
