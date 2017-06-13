// index here exports the entire project
// we'll try to keep the same class structure, OOP style
// we'll need to expose several entities
// the first one is the filesystem supplied
// this will wrap memory-fs or fs-extra (both have promise styles, quacks like a duck...)
// the main idea is preserve the fs interface
// the wrapper will be able to
// multiple exports, users only need to export once to know what to use
// the actual system is exposed direclty? should there be be instantiations?
// let fs = new MemoryFS;
// let fs = new FS;
// no we expose our versions of the fs...
// import { MemoryFileSystem } from 'node-git';

exports.
exports.Repository = require('./Repository.js');
