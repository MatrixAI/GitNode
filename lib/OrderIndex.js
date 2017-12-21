// data is whatever the node is truly carrying around
// that's how we build out from JSON
// note that JSON works like root object (never array)
// and then each child is converted
// what about the keys of the children
// they represent the label like
// { label: 'mycoolprop', data: [ 'abc', 'dee' ] }
// we don't index into arrays then
// only object structures
/*

   {
     section: {
       heading: "abc",
       c: "dee"
     },
     e: [1,2,3,4]
   }

   there would be a text index that allows you to query
   give me all the nodes that have //section[heading = "abc"]/c
   // so that would find headings with "abc"
   // that would already index into the heading
   // find the section, then get the node with c
   // it can use the index again to find nodes with c?
   // but probably it would just check against the real data structure


*/


type node = {
  level: integer;
  lower: backlink;
  upper: backlink;
  data: Object;
};

// the type of backlink changes the way the find function works
// also changes the way the B+tree insertion works
type backlink = [Block, number];
// ok i got it


// 1 byte number
// new Uint8Array(1)
// vs a number of some sort
// if they are gaps we don't need to relable the table as often

// we need to setup the find operation
// backlink is pointer to Block and number offset (gap offset into it)

// nodeCursor maintains both the node that we are pointing to
// and also the cursor pointer?
// why we do this?
// because maintaining order index pointer requires using backlink find
// and maintaining node requires using map hash
// so we have 2 things
// a node and a cursor

// a node can be converted to a cursor via backlink find
// a cursor can be converted to a node via map hash find
// they are cached things...
// but if the order index also stored pointers to the node itself
// it would be circular data structure
// not sure how we should approach this problem...?

type cursor = {
};

interface OrderIndex {
  getNodeId (entry: orderEntry): number;
  findEntry (backlink: backlink): entry;
  isLower (entry: orderEntry): boolean;
  isBefore (entry1: orderEntry, entry2: orderEntry): boolean;
  nextEntry (entry: orderEntry): orderEntry;
  adjustLevel (entry: orderEntry);
}

// true and false is fine as well
// true representing opening, and false representing closing
type orderEntry = {
  nodeId: number;
  type: boolean;
};

// an orderEntry is then wrapped in the B+tree node

// Keyless B+Tree Order Index
class BOTree implements OrderIndex {

  blockSize: number;

  // we need to implement a B+tree
  constructor (blockSize: number) {
    this.blockSize = blockSize;

  }

  getNodeId (entry: orderEntry): integer {
  }

  findEntry (backlink: backlink): entry {
  }

  isLower (entry: orderEntry): boolean {
  }

  isBefore (entry1: orderEntry, entry2: orderEntry): boolean {
  }

  nextEntry (entry: orderEntry): orderEntry {
  }

  adjustLevel (entry: orderEntry) {
  }


  // we also need parent pointers

  // b+tree operations
  // this is not a concurrent tree lol
  // should we extend from an existing b+tree impl?
  // tree index should remain stable after each operation
  // not designed for concurrent use..
  // that is single operation must complete each time

  insert () {

  }

  delete () {

  }

  // bulk load by producing the leafs first in an array
  // and then constructing their parents
  // inserting here depends on the nested interval encoding
  // do we take the list of nodes here to build?
  // each node must then have their backlinks inserted too
  // and we assume that the array is sorted?

  load (nodes: Array<node>) {

    // sort order entries according to nested interval order
    // allocate empty block to be root
    // create first block of entries and insert it into the root
    // when root is full, split root, create new root
    // keep inserting entries to the right most index page just above leaf level

  }

  // split operations?

}

// this indexes a tree, but also wraps it
// you should not modify the tree without this
// so maybe we should return a tree view instead
// if mutations occur outside the tree index
// this tree index becomes invalidated and must be rebuilt
// instead use Object.freeze??
class TreeIndex {

  tree?: {};
  nodes: Map<integer, node>;
  orderIndex: OrderIndex;

  construct (orderIndex: OrderIndex) {
    this.nodes = new Map;
    this.orderIndex = orderIndex;
  }

  // could be undefined
  // this represents the underlying data
  // so we return a freezed object
  getTree (): {}|void {
    // the original object is frozen too
    // that's bad, we only want a frozen proxy of some sort
    // actually just return a clone of this object
    // but we'd need
    // that seems really inefficient
    // immutable.js offers a Immutable.fromJS to help with this
    // and so it will deal with nested trees
    // so it is a bit inefficient
    return this.tree;
  }

  fromTree (tree: {}) {
    this.tree = tree;
    // do the bulk build here
    // iterate over each node
    // insert into nodes map
    // insert into the orderIndex
    // note that you need a worker function
    // since you insert the tree here at the end
  }

  // how is builk build done?
  // and don't we need to take in a hierarchy to build it
  // how do we maintain synchronisation with changes
  // well there must be update functions we must also build into it
  // and all update functions must then be mediated via this index

  // these operations are implemented in terms of the OrderIndex interface
  isDescendant () {

  }

  isChild () {

  }

  isBeforePre () {

  }

  isBeforePost () {

  }

  level () {

  }

  isRoot () {

  }

  isLeaf () {

  }


  // at some point you need to convert the cursor back into the relevant node too

  find (node: node): cursor {

  }

  nextPre (cursor: cursor): cursor {

  }

  prevPre (cursor: cursor): cursor {

  }

  nextPost (cursor: orderCursor): orderCursor {

  }

  // why not just return the node directly that points to it
  // so you can just navigate the tree accordingly?
  // because the cursor may maintain information that the node doesn't
  // that is the running of the "this.orderIndex.find" function
  // that has to traverse the node.lower... etc
  // so this is better for traversal
  // so go from node to node, you want to
  // so instead create a composite structure called a cursor
  // and only return the node when converting the cursor -> node



  // this takes a node, and returns the order index entry
  // why return what the order index entry is, unless you're exposing the type!
  // i think the underlying order index should be encapsulated
  // so you shouldn't be exposing the individual orderindex entries
  // apparently we expose the secondary index "entry"
  // this represents a cursor into the secondary index
  // all operations on cursors are based on the next stuff
  // nextPre, nextPost, nextSibling
  // what about previous??
  find (node) {
    this.orderIndex.find(node.lower);
  }

  // depth-first pre order
  // this should not be exposed
  // this should work on cursors instead
  // cursors would encapsulate the actual orderEntry
  // but also... you can really use a zipper on a b+tree, just not the same thing
  nextPre (entry: orderEntry): orderEntry {

  }

  // depth-first post order
  // somehow the orderEntry can give us back abilities to go somewhere
  // so we should use a cursor instead
  // call it the orderCursor
  // what about going up the parent?
  // then you can open new things
  // what about going to the previous one?
  nextPost (entry: orderEntry): orderEntry {

  }

  // this one doesn't use a entry, it uses a node
  // given a node, find its sibling
  // it takes a node, finds the entry for its upper position
  // gives back next entry in entry order
  // this impl doesn't make sense
  // if you give it 4, it gives you 2
  // 2 is not a sibling, it is the parent!
  // so the parent node is the terminal node?
  // so if you end up with the parent, it's actually the no more siblings!
  nextSibling () {

  }


  // the above 4 functions use the cursor to orderEntry instead of exposing it directly
  // suppose we use a zipper on the order index somehow?


  // given a tree structure (a JSON data type)
  // bulk build or tree from it
  buildBuild () {

  }

  deleteLeaf () {

  }

  insertLeaf () {

  }

  relocateLeaf () {

  }

  deleteSubtree () {

  }

  insertSubtree () {

  }

  relocateSubtree () {

  }

  deleteRange () {

  }

  insertRange () {

  }

  relocateRange () {

  }

  deleteInner () {

  }

  insertInner () {

  }

  relocateInner () {

  }

}

// so the tree index is not a secondary index, but represents an encoding scheme now
// you pass in the JSON tree, and this wraps around it and encapsulates it
// all operations on this tree is mediated via this tree wrapper
// don't know what to call it yet
