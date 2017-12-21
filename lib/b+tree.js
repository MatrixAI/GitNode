// @flow

class Block {
  parent: ?Block;
  levelDelta: number;
  constructor (parent: ?Block, levelDelta: number = 0) {
    this.parent = parent;
    this.levelDelta = 0;
  }
}

function setupBlockConstructors (blockSize: number) {

  class Leaf extends Block {
    _entries: Array<OrderEntry>;
    constructor (parent: ?Block) {
      super(parent);
      this._entries = new Array(blockSize);
    }
    insert (start: number, length: number, entry: OrderEntry) {
      this._entries.splice(start, length, entry);
    }
  }

  class Node extends Block {
    _children: Array<Block>;
    constructor (parent: ?Block) {
      super(parent);
      this._children = new Array(blockSize);
    }
  }

  return {
    Leaf: Leaf,
    Node: Node
  };

}

class KeylessBPlusTree {

  _blockConst: { Leaf: Class<Block>, Node: Class<Block> };
  _tree: Block;

  constructor (blockSize: number = 64) {
    if (blockSize % 2 !== 0) {
      throw new RangeError('blockSize must be even for even splitting');
    }
    if (blockSize < 2) {
      throw new RangeError('blockSize must be greater than 2 for splitting');
    }
    this._blockConst = setupBlockConstructors(blockSize);
    this._tree = new this._blockConst.Leaf;
  }

  // so insertion means inserting according to some other entry
  // or insertion means inserting according to some sort leaf block position
  // we also need to know which block we are inserting into
  // so B+tree itself has no insertion op
  // there's insert at the block class
  // which knows which things to insert at
  // ooooo

  insert (begin: number, count: number, entry: orderEntry): void {

    // insertion is just a normal B+tree insertion
    // without the prior key search
    // since there are no keys to search
    // what's actually being inserted
    // is an orderEntry
    // so something creates an orderEntry first
    // and sends it over to us
    // these types are shared
    // ok.. so what does this mean?
    // which leaf do you insert into into...
    // do you insert at a particular leaf
    // insertLeaf (a, p)
    // so a is the node already created (real tree node)
    // p is the position into the tree

    // an insertion as a child leaf
    // means you're going into an interval
    // the interval could be say 3[3]
    // so that means you have some access to the order index already
    // which means you need to find the block you want insert into

    // we'll need to splice the shit
    // but where do we splice
    // we need a position notation here
    // splice relies on a start and finish
    // ...

    // BOTree insertion requires this understanding, as this is position where we need to acquire shit

  }


}
