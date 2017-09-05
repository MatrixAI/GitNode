var lib = require('./lib.js');
var print_str = lib.cwrap('print_str', null, ['string']);

console.log(lib.print_hello());
print_str("Hello from extern C");
console.log(lib.lerp(1, 2, 0.5));
console.log(lib.print_str_cpp("Hello from C++"));
console.log(lib.get_str_from_obj({"key": "Hello from a JS object"}));
