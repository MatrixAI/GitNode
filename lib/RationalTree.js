// first we need a simple table structure that indexes each element
// well we really have node object
// left number
// right number
// and then we other information like a pointer to the actual node object
// you may want to query based on a matrix right?
// can you use a typed array as a key for equality?
// note that means we cannot use a standard matrix object but the primitive
// you cannot compare typed arrays for equality
// so we cannot use them as keys
// instead an array of numbers
// so maybe instead we don't want to index every value?
// where every key is a value and every value is a key
// wait how would you look up a situation
// where you use [nv, dv, snv, sdv]?
// wait... yea you would never need to do this
// you always work with entire nv,dv,snv,sdv

// if we do it this way with nested intervals
// we're actually using a table to encode the tree
// the examples in order index is using AVLtree to store the
// gap intervals
// or a balanced tree
// not just a straight forward table
// if so, there would be 2 table entries
// RID (NODE) LEVEL? NV DV SNV SDV
// rather than as pointers to a secondary structure
// the entire thing is just 1 table...
// the order index structure main mutation system is via relocate_range
// everything else is built around it
// relocate range crops the range of bounds [a, b] and alter the level adjustment the value returned by adjust_level
// ok so adjust_level returns back a number, this number is called the "level adjustment"
// and then reinsert the [a,b] at target position
// so this level adjustment number must be used in a lazy manner
// the number returned is always added to the level stored in the table row
// this way you avoid having to alter the table in case of range relocation
// right so the table doesn't actually get changed with its level information until you query it i guess, or you do some sort of level query
// you use an accumulation tree
// still with rational tree, this isn't needed at all

// after cropping the bound range [a,b], the desired level (the final level?) is called delta
// the delta is added to the block level of the root blocks of that range
// which effectively adds the delta to the levels of all entries within [a,b]
// so you add it into the block level?
// the cost of level(a) becomes linear to the height of the data structure
// during an index scan (which means what?)

// "However, during an index scan, the level adjustment can be tracked and needs to be refreshed only when a new block starts. This yields amortized constant time for level."

// level(a) => a.level + adjust_level(find(a.lower))
// to get the level of node a
// get a.level add onto adjust_level which accumulates the block levels starting from the a.lower
// 2 + 2 + -2 + 1
// where did these numbers come from?
// I just don't get where these block level numbers come from if adjust_level is meant to be calculating this
// how did those numbers even get entered into the AVL tree?


// [ nv, dv, snv, sdv, p ]
// where p is a pointer to a node structure containing data like the actual values within the node

// Go up to parent:
// AOTree - use pointers
// BOTree - use pointers
// RationalKeys - use matrix multiplication
// Level calculation:
// AOTree - use accumulation from leaf to root
// RationalKeys - use matrix multiplication to the root (also log n)
// Before condition:
// AOTree - walk up the tree using least common ancestor and check if the left path arrives from the left
// RationalKeys - Should be able to calculate this using a predicate on the key numbers, a preorder predicate on the nv and dv, constant time
// Leaf updates:
// AOTree - binary tree insert with rotation
// RationalKeys - Just matrix calculation, and insert whereever (but you have to know which node you want to insert on first), pretty much constant time as well
// Check if sibling:
// AOTree - next_sibling (and then check), but that's just one check as well
// RationalKeys - ?? you can check if it is directly the next sibling, but that just means calculating snv sdv each time, you have the next snv sdv already so that's easy, but what about any amount of sibling, I think you check if you are on the same level, and then just make sure it is greater or lesser

// so what is this indexing
// well XML data is a tree
// so are we using order index on the entire tree?
// that is once you have a representation of the xml tree
// you load in every node into it?
// but how do you query and search through it?
// like usage of things like text search
// like a text token index?
// so does that mean you actually search through the AOTree by just navigating through the tree itself, and you have log(n) search?

// the order index is an encoding on the entire XML tree or any tree based data
// it's not the index per-say
// instead it presents a stable node identifiers, and efficient update mechanism
// that stable node identifier which is the RID is the actual thing we index against
// another hashtable which could be the text index, relates text tokens to stable node identifiers like the RID

// Range relocations:
// AVLTree - Split and Join described in DeltaNI
// actually this is a standard split and join function applied to AVLtrees
// however I do not see it, except in other papers https://en.wikipedia.org/wiki/AVL_tree (it exists !!!)
// why is there no relabelling for the GapNI? Doesn't the left and right numbers need to change?

/*

  RID is the stable node identifier

  [
    { text: "hello", nid: RID },
    { text: "hello2", nid: RID2 }
  ]

  Order Index represenetation

  [
    { RID: 0, LEFT: ..., RIGHT: ... },
    { RID: 1, LEFT: ..., RIGHT: ... }
  ]

  Secondary structure may be AOTree, BOTree, or OList or RationalKeysTree

*/
