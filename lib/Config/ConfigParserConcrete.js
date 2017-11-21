// this describes the concrete syntax grammar
// this means all lexer tokens are considered and none are considered hidden
// this is necessary to produce a tree that directly maps from the file contents
// and allow 2 kinds of visitors
// one that traverses the tree to produce a map
// and one that traverses the tree to create the original file
// that is the tree is the one to traverse to acquire the actual config key value
// oh yea, so we don't actually need a config Map
// we just use the tree and traverse it each time to acquire the value ofsome key
// later in the future it may be possible to create minimal map from the tree and maintain sync between the 2 data structures
// it means the map will have to maintain positional encodings into the tree
// so that a map can always be converted back to the tree
// or another way is to actually "index" the tree, and create a  map based on the these indexes
// so asking for section.subsection.key is a "key" that leads a value, which is actually a path into the CST that acquires the object containing the value
// so you don't actually the traverse it except to build up the treee...
// yea that's a good idea

/*
  // so if it is a header, it will need to go INTO the body
  // now we need to explicitly state  that all 3 are possible

  top ::= ((WhiteSpaceT | EndOfLineT | CommentT | header) )*
  header ::= HeaderEnterT heading WhiteSpaceT* HeaderSubNameT? WhiteSpaceT* BodyEnterT
  heading:: = HeaderIncludeIfT | HeaderIncludeT | HeaderNameT

  top    ::= (header body)*
  header ::= (HeaderIncluderIfT | HeaderIncludeT | HeaderNameT) HeaderSubNameT? BodyEnterT
  body   ::= (key ValueEnterT value)*
  key    ::= BodyKeyT
  value  ::= (ValueStringT | ValueSpaceT | ValueQuotedStringT)*
*/

import { Parser } from 'chevrotain';

import * from './ConfigLexer.js';

// do we consider all values to be strings?
// yes... that's how it will be displayed to end user
// if the end user expects a number, then they have to coerce or check that it is number
//
// note that as the tree's value changes, the numbers of where things are also changes
// but that's alrght since cst does not store that
// like line numbers and shit

type treePath = { value: string };
type configIndex = Map<string, treePath>;
type inclusions = Set<number>; // also set based inclusion round trip prevention

class ConfigParser extends Parser {

  // how to deal with multiple inclusions
  // will need to have multiple trees
  // as you work against the tree
  // the paths will need to be added
  // so the map is the index into the tree
  // Map<string, string>
  // key: section.subsection.key
  // value: 'path.to.object'
  // actually value is an Object, it's the container object right
  // Map<string, objectPath>
  //
  // where objectPath is a proxy object of the final object
  // the proxy of a string!?
  //
  // a special object that upon changing refers to ability to get the value itself
  // that is
  //
  //
  // {
  //   get value ()  { return pathtostree; }
  //   set value (v) { pathtotree.value = v; }
  // }

  _interpret: ?interpret;
  _configIndex: configIndex;

  constructor (interpret) {
    super([], lexicalGrammar, {outputCst: true});
    this._interpret = interpret;
    Parser.performSelfAnalysis(true);
  }

}
