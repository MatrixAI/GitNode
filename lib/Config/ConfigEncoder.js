// @flow
// this needs to take a config object and encode it back into text strings
// the laws are that serial (deserial a) === a
// those are the tests

class ConfigEncoderError {

}

/*
  top    ::= (header body)*
  header ::= HeaderNameT HeaderSubNameT? BodyEnterT
  body   ::= (key ValueEnterT value)*
  key    ::= BodyKeyT
  value  ::= (ValueStringT | ValueSpaceT | ValueQuotedStringT)*
*/
class ConfigEncoder {

  _fs;

  constructor (fs) {
    this._fs = fs;
  }

  // are we talking about git repos in windows or linux?
  encode (config: config): string {
    let text = '';
    for (const [header, body] of config) {
      text += this._encodeHeader(header);
      text += '\n';
      text += this._encodeBody(body);
      text += '\n\n';
    }
    return text;
  }

  _encodeHeader (header) {
    const index = header.indexOf(' ');
    let text = '[';
    if (index !== -1) {
      text += header.slice(0, index);
      text += '"' + header.slice(index + 1) + '"';
    } else {
      text += header;
    }
    return text + ']';
  }

  // note that multivalues!!!
  // oh yea normal git will search through and then rerun it
  // but i don't it matters too much here
  _encodeBody (body) {
    let text = '\t';
    for (const [key, values] of config) {
      for (const value of values) {
        text += this._encodeKey(key);
        text += ' = ';
        text += this._encodeValue(values);
        text += '\n';
      }
    }
  }

  _encodeKey (key) {
    return key;
  }

  // we don't know whether value is a string or not
  // we cannot preserve the necessary need to preserve the string?
  // but if the string has special characters in order to preserve them, they need to have a double quote
  // yea you cannot encode it properly
  // since the strings will need double quotes to be safe
  // but numbers are not the same
  // so numbers have to be left as is
  // shit..
  // you cannot set these things like that
  // we need a CST... and remember how those values are combined
  _encodeValue (value) {
    return '"' + value '"';
  }




}

export { ConfigEncoder, ConfigEncoderError };
