import test from 'ava';
import { VirtualFS } from 'virtualfs';
import { stripIndent } from 'common-tags';
import { ConfigInterpreter, ConfigInterpreterError } from '../../lib/config/ConfigInterpreter.js';

test('interpret inclusion', t => {
  const fs = new VirtualFS;
  let text;
  text = stripIndent`
    [section]
      key = value1
    [include]
      path = /b.config
    [section]
      key = value3
  `;
  fs.writeFileSync('/a.config', text);
  text = stripIndent`
    [section]
      key = value2
  `;
  fs.writeFileSync('/b.config', text);
  const interpreter = new ConfigInterpreter(fs);
  const map = interpreter.interpret('/a.config');
  t.deepEqual(
    [...map.get('section')],
    [
      ['key', ['value1', 'value2', 'value3']]
    ]
  );
});

test('interpret inclusion with current directory change', t => {
  const fs = new VirtualFS;
  let text;
  text = stripIndent`
    [section]
      key = value1
    [include]
      path = ../b.config
    [section]
      key = value3
  `;
  fs.mkdirSync('/tmp');
  fs.writeFileSync('/tmp/a.config', text);
  text = stripIndent`
    [section]
      key = value2
  `;
  fs.writeFileSync('/b.config', text);
  fs.chdir('/tmp');
  const interpreter = new ConfigInterpreter(fs);
  const map = interpreter.interpret('./a.config');
  t.deepEqual(
    [...map.get('section')],
    [
      ['key', ['value1', 'value2', 'value3']]
    ]
  );
});

test('interpret inclusion DAG', t => {
  const fs = new VirtualFS;
  let text;
  text = stripIndent`
    [include]
      path = /b.config
      path = /c.config
    [section]
      key = value2
  `;
  fs.writeFileSync('/a.config', text);
  text = stripIndent`
    [include]
      path = /d.config
  `;
  fs.writeFileSync('/b.config', text);
  text = stripIndent`
    [include]
      path = /d.config
  `;
  fs.writeFileSync('/c.config', text);
  text = stripIndent`
    [section]
      key = value1
  `;
  fs.writeFileSync('/d.config', text);
  const interpreter = new ConfigInterpreter(fs);
  const map = interpreter.interpret('/a.config');
  t.deepEqual(
    [...map.get('section')],
    [
      ['key', ['value1', 'value1', 'value2']]
    ]
  );
});

test('interpreter catches inclusion loop', t => {
  const fs = new VirtualFS;
  let text;
  text = stripIndent`
    [include]
      path = /b.config
  `;
  fs.writeFileSync('/a.config', text);
  text = stripIndent`
    [include]
      path = /a.config
  `;
  fs.writeFileSync('/b.config', text);
  const interpreter = new ConfigInterpreter(fs);
  const error = t.throws(() => {
    interpreter.interpret('/a.config');
  });
  t.is(error.code, ConfigInterpreterError.ERROR_LOOP);
});

test('interpreter ignores missing inclusion files', t => {
  const fs = new VirtualFS;
  const text = stripIndent`
    [include]
      path = /b.config
    [section]
      key = value
  `;
  fs.writeFileSync('/a.config', text);
  const interpreter = new ConfigInterpreter(fs);
  const map = interpreter.interpret('/a.config');
  t.deepEqual(
    [...map.get('section')],
    [
      ['key', ['value']]
    ]
  );
});

test('interpreter returns falsy if the initial config file is missing', t => {
  const fs = new VirtualFS;
  const interpreter = new ConfigInterpreter(fs);
  const map = interpreter.interpret('/a.config');
  t.falsy(map);
});

test('interpreter lexer errors', t => {
  const fs = new VirtualFS;
  const text = stripIndent`
    [section "subsection]
      key = value
  `;
  fs.writeFileSync('/a.config', text);
  const interpreter = new ConfigInterpreter(fs);
  const error = t.throws(() => {
    interpreter.interpret('/a.config');
  });
  t.is(error.code, ConfigInterpreterError.ERROR_LEX);
});

test('interpreter parser errors', t => {
  const fs = new VirtualFS;
  const interpreter = new ConfigInterpreter(fs);
  let text;
  text = stripIndent`
    [section "subsection" abc]
      key = value "value"
  `;
  fs.writeFileSync('/a.config', text);
  let error;
  error = t.throws(() => {
    interpreter.interpret('/a.config');
  });
  t.is(error.code, ConfigInterpreterError.ERROR_PARSE);
  text = stripIndent`
    [section "subsection"]
      key key = value "value"
  `;
  fs.writeFileSync('/a.config', text);
  error = t.throws(() => {
    interpreter.interpret('/a.config');
  });
  t.is(error.code, ConfigInterpreterError.ERROR_PARSE);
});
