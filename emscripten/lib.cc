#include <cstdio>
#include <iostream>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>

// use this when necessary
// extern "C" {
//   #include <git2.h>
// }

namespace e = emscripten;

using namespace std;

void print_hello () {
  printf("Hello World\n");
}

extern "C" {
  EMSCRIPTEN_KEEPALIVE
  void print_str (const char * str) {
    printf("%s\n", str);
  }
}

extern "C" {
  void exported_from_cpp () {
    printf("%s\n", "Hi from C and exported from CPP");
  }
}

void print_str_cpp (string str) {
  cout << str;
  cout << endl;
}

float lerp (float a, float b, float t) {
  return (1 - t) * a + t * b;
}

string get_str_from_obj (e::val obj) {
  return obj["key"].as<string>();
}

#define SOME_CONSTANT 100

// this is "Value Array" because the same type is used and it's fixed memory
struct Point2F {
  float x;
  float y;
};

struct PersonRecord {
  string name;
  int age;
};

// we only need a function declaration like this
// and the whole thing ends up working!
// so we do this with all the functions in libgit in the git header
PersonRecord findPersonAtLocation(Point2F);

// the name here seems useless
EMSCRIPTEN_BINDINGS(my_module) {
  e::function("print_hello", &print_hello);
  e::function("lerp", &lerp);
  e::function("print_str_cpp", &print_str_cpp);
  e::function("get_str_from_obj", &get_str_from_obj);
  e::constant("SOME_CONSTANT", SOME_CONSTANT);
  e::value_array<Point2F>("Point2f").element(&Point2F::x).element(&Point2F::y);
  e::value_object<PersonRecord>("PersonRecord").field("name", &PersonRecord::name).field("age", &PersonRecord::age);
  e::function("findPersonAtLocation", &findPersonAtLocation);
  e::function("exportedFromCpp", &exported_from_cpp);
}

/*
emcc -O2 -Wall -Werror --bind ./lib.cc -o lib.bc
emcc -O2 -Wall -Werror --bind --pre-js ./prejs.js -s PRECISE_I64_MATH=1 -s PRECISE_F32=1 -s ASSERTIONS=2 lib.bc -o lib.js
*/
