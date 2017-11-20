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
