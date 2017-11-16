function interpret (path, read, map) {
  const text = read(path);
  const lexer = new Lexer(lexicalGrammar);
  const result = lexer.tokenize(text);
  const parser = new ConfigParser(result.tokens, [map, interpret]);
}

function interpretToMap () {
  const map = new Map;
  const read = (path) => fs.readFileSync(path, 'utf8');
  interpret('test.config', read, map);
  return map;
}
