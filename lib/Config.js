// @flow

import typeof { VirtualFS } from 'virtualfs';

// we assume we have access to the cstIndex
// and the cstTags
import { ConfigInterpreter } from './Config/ConfigInterpreter.js';

type path = string;


class Config {

  _fs: VirtualFS;
  _path: path;
  _interpreter: ConfigInterpreter;

  _cstIndexKeyValue: _cstIndexKeyValue;
  _cstIndexSection: _cstIndexSection;

  _cstTags: cstTags;
  _csts: Array<cst>;

  constructor (fs: VirtualFS, path: path) {
    this._fs = fs;
    this._path = path;
    const interpreter = new ConfigInterpreter(fs);
    this._interpreter = interpreter;
    this._localConfig = interpreter.interpret(path, false);
    this._globalConfig = interpreter.interpret(path, true);
  }

  _toFile () {
    // we need some sort of serialiser for the same data
    this._fs.writeFileSync(this._path, false);
  }

  // the path here must to be a key value
  // but that we assume that's what it means
  // it will need to create the parent sections if needed
  // it also sets a single specific value
  // under relevant sections if needed
  // this is wy it makes sense to differiate
  // we can only set on the first _cst
  // that is what we consider the local cst
  // all other csts are irrelevant
  set (selector: string, value: string) {

    // so the idea is to check for a key value
    // here we search across all key value
    //
    // instead of searching through all cursors
    // what if we already knew all the cursors that are part
    // part of the primary cst?
    // also don't we also need to set the last or first... i dunno?
    const cursors = this._cstIndexKeyValue.get(selector);
    if (cursors) {
      for (const cursor of cursors) {
        if (this._cstPrimary === this._cstTags.get(cursor)) {
          cursor.setValue(value);
          return;
        }
        // none of the cursors is of the right CST
      }
    }
    // there are no cursors available for this
    // we now check for section cursor
    // note that the selector string may be s.s
    // so what we need to do is find the section before it

    const sectionSelector = doSomething(selector);
    const sectionCursors = this._cstIndexSection(sectionSelector);
    if (sectionCursors) {
      for (const sectionCursor of sectionCursors) {
        if (this._cstPrimary === this._cstTags.get(cursor)) {
          sectionCursor.add(key, value);
        }
      }
    }

    // yea I think we need a local index and global index
    // local index for each individual CST file
    // and global index for all
    // this way we can easily only use local index for set operations
    // and global index for get operations
    // note that setting operations requires changing the local and global index
    // the local index has a new entry
    // the global index gains a new entry as well
    // however the order of entries is now different
    // IF we add a new value to a new section
    // this means we are adding a whole new index key pair
    // that's fine no problems
    // oh yea, how do we deal with
    //
    // multiple values in a config, and the setting operation
    // on multiple values?
    // does it remove all of them?
    // also if we do add a new index, the order is important for the global index isn't it?
    // we cannot just append it to the global index
    // say
    // S1.K exists on the global index
    // S1.K doesn't exist on the local cst/index
    // then adding a new S1.K onto local index means prepending
    // the global index's S1.K
    //
    // if S1.K exists on the local index already
    // what does the set do? it changes the value
    // if S1.K exists multiple times
    // what does the set do?
    //
    // suppose a more general situation
    // where you have CST indexes and a global index for the entire CST
    // and you wanted to be able to easily access each CST's individual index, and change them as well
    // changes to local CST indices, how do they affect the global indice?
    // the global indice would instead need to order each index
    // S1.K on the global index
    // doesn't just return an array of cursors
    // but an Dictionary of CST to cursors
    // so that way you can go through every cursor in order
    // if the global index was { [selector]: { [CST]: Array<Cursor> } }
    // you could easily find the right CST by looking it by the key
    // so that's a good idea
    // and you can also iterate over all in order too
    // HOWEVER
    //
    // it loses the order of setting
    // since a CST may include another CST
    // but may set the value afterwards
    // the included CST may have a particular value
    // while the including CST may have a different value
    // the order of CSTs do map directly to the order of Cursors by predecend
    //
    // it appears we need 2 views
    //
    // one that gives us the order of precedence for each cursor
    // and one that gives us the CST to the cursor
    // that way we can iterate over an individual's CST's cursors
    // while also iterating over the global order as well
    //
    // this is the same problem as childList and childDict
    // you want to be able to iterate over all elements in insertion order
    // while also being able to acccess them by key, which leads to a range access
    //
    // imagine this:
    //
    // dict: {
    //   elem1: [ child1, child2, child3 ]
    //   elem2: [ child1, child2 ]
    // }
    //
    // while the order of traversal was elem1.child1, elem2.child1, then elem1,child2, then elem1.child3 and then finally elem2.child2
    // the way to do this is doubly linked list
    // where each child has pointers to other children
    // the advantage of this is that deleting a child must link both together up
    // container[X] gives you the X element
    // container[selector][X] gives you the Xth element of the selector
    // a linked list does not have random access
    //
    // our container of cursors
    // is the index into the system using cursors
    // but as we update the data, we need to update the cursor
    // so we need to understand how these operations will be applied
    //
    //
    //
    // consider the native approach
    // with each path string
    // mapping to an Array<cstCursor>
    // and dictionary having Map<cst, Array<cstCursor>>
    //
    // getting is simple
    // you just get it from the relevant array
    // note that you'd have separate ones for section cursors
    // and key value cursors
    //
    // adding a new value to a section
    // requires looking up the section key
    // you need to look for the primary cst's cursors
    // so that means cstIndex.get('section').cursorDict.get(primaryCst)
    // assumeing this gives you the section index
    // we can now go into the cursor for the section
    // the cursor exposes the function to add a new value into
    // so let's say we add
    // section.key
    // now what's happened is that, it adds it to the end
    // so it needs to update the index
    //
    // so it needs to create a cstCursor to that new section.key
    // and inject it into cursorList (however how do we know which index to splice into
    // a new one into cursorDict.set(primaryCst, [newCursor])
    // the problem is splicing it into the array

  }

  get (selector: string): ?string {
    const cursors = this._cstIndexKeyValue.get(selector);
    if (cursors) {
      return cursors[cursors.length - 1].getValue();
    }
  }

  getAll (selector: string): Array<string> {
    const cursors = this._cstIndexKeyValue.get(selector);
    if (cursors) {
      return cursors.map((cursor) => cursor.getValue());
    } else {
      return [];
    }
  }

  del () {

  }

}

export default Config;
