// use late binding of this, and access FS using `this.FS`
// this will refer to the fully resolved `LibraryManager.library`

// ops_table is null even though it refers to the same functions defined in the $MEMFS object
// lol
// we cannot have self-references in a javascript object literal notation
// we can proxy functions, but not proxy properties
// because of eval compile time evaluation
// so ops_table has to remain the same here

// what if Module.$VIRTUALFS was actually new VirtualFS
// then we would just write the necessary bindings here
// that this would be the adapter, not just a proxy to another adapter
// in that way, we can directly access things like
// there'a reason not to use this
// cause if they assign the function to a separate object
// the this is going to be rebound
// that's why they use the MEMFS

// we need to use Module.$VIRTUALFS
// but within this, it needs to expose all of the types and constructors as well

// expect variables in context:
// VirtualFS
// Buffer

mergeInto(LibraryManager.library, {
  $MEMFS__deps: ['$FS'],
  $MEMFS: {
    ops_table: null,
    mount: function (mount) {
      return MEMFS.createNode(
        null,
        '/',
        VirtualFS.constants.S_IFDIR | 511 /* 0o777 */,
        0
      );
    },
    setupFSNode: function () {
      // this strange function is because the constructor function FSNode
      // has to be setup dynamically due to emscripten library constraints
      if (!MEMFS.FSNode) {
        MEMFS.FSNode = function(parent, name, mode, rdev, inodeIndex) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.mounted = null;
          this.id = inodeIndex;
          this.name = name;
          this.mode = mode;
          this.node_ops = {};
          this.stream_ops = {};
          this.rdev = rdev;
        };
        MEMFS.FSNode.prototype = {};
        // compatibility
        var readMode = VirtualFS.constants.S_IRUGO | VirtualFS.constants.S_IXUGO;
        var writeMode = VirtualFS.constants.S_IWUGO;
        // NOTE we must use Object.defineProperties instead of individual calls to
        // Object.defineProperty in order to make closure compiler happy
        Object.defineProperties(MEMFS.FSNode.prototype, {
          read: {
            get: function() { return (this.mode & readMode) === readMode; },
            set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
          },
          write: {
            get: function() { return (this.mode & writeMode) === writeMode; },
            set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
          },
          isFolder: {
            get: function() { return FS.isDir(this.mode); }
          },
          isDevice: {
            get: function() { return FS.isChrdev(this.mode); }
          }
        });
      }
    },
    createNode: function (parent, name, mode, rdev) {

      // we don't care about dev here
      // parent is an emscripten inode
      // name is a string of the full/relative path
      // mode is the actual file mode
      // rdev is the kind of device it is (only used for character devices in our case)

      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(ERRNO_CODES.EPERM);
      }

      // this is a inodeNumber or inodeIndex
      var inode;

      if (FS.isDir(mode)) {
        inode = VirtualFS.fs._inodeMgr.createINode(
          VirtualFS.Directory,
          { mode: mode, parent: (parent) ? parent.getMetadata().ino : null }
        );
      } else if (FS.isFile(mode)) {
        inode = VirtualFS.fs._inodeMgr.createINode(
          VirtualFS.File,
          { mode: mode, data: Buffer.allocUnsafe(0) }
        );
      } else if (FS.isLink(mode)) {
        inode = VirtualFS.fs._inodeMgr.createINode(
          VirtualFS.Symlink,
          { mode: mode, link: '' }
        );
      } else if (FS.isChrdev(mode)) {
        inode = VirtualFS.fs._inodeMgr.createINode(
          VirtualFS.CharacterDev,
          { mode: mode, rdev: rdev }
        );
      }

      MEMFS.setupFSNode();
      var node = MEMFS.FSNode(parent, name, mode, rdev, inode);

      // add extra node properties to meet emscripten expectations


    },
    getFileDataAsRegularArray: function () {
      return Module.$VIRTUALFS.getFileDataAsRegularArray.apply(this, arguments);
    },
    getFileDataAsTypedArray: function () {
      return Module.$VIRTUALFS.getFileDataAsTypedArray.apply(this, arguments);
    },
    expandFileStorage: function () {
      return Module.$VIRTUALFS.expandFileStorage.apply(this, arguments);
    },
    resizeFileStorage: function () {
      return Module.$VIRTUALFS.resizeFileStorage.apply(this, arguments);
    },
    node_ops: {
      getattr: function () {
        return Module.$VIRTUALFS.node_ops.getattr.apply(this, arguments);
      },
      setattr: function () {
        return Module.$VIRTUALFS.node_ops.setattr.apply(this, arguments);
      },
      lookup: function () {
        return Module.$VIRTUALFS.node_ops.lookup.apply(this, arguments);
      },
      mknod: function () {
        return Module.$VIRTUALFS.node_ops.mknod.apply(this, arguments);
      },
      rename: function () {
        return Module.$VIRTUALFS.node_ops.rename.apply(this, arguments);
      },
      unlink: function () {
        return Module.$VIRTUALFS.node_ops.unlink.apply(this, arguments);
      },
      readdir: function () {
        return Module.$VIRTUALFS.node_ops.readdir.apply(this, arguments);
      },
      symlink: function () {
        return Module.$VIRTUALFS.node_ops.symlink.apply(this, arguments);
      },
      readlink: function () {
        return Module.$VIRTUALFS.node_ops.readlink.apply(this, arguments);
      }
    },
    stream_ops: {
      read: function () {
        return Module.$VIRTUALFS.stream_ops.read.apply(this, arguments);
      },
      write: function () {
        return Module.$VIRTUALFS.stream_ops.write.apply(this, arguments);
      },
      llseek: function () {
        return Module.$VIRTUALFS.stream_ops.llseek.apply(this, arguments);
      },
      allocate: function () {
        return Module.$VIRTUALFS.stream_ops.allocate.apply(this, arguments);
      },
      mmap: function () {
        return Module.$VIRTUALFS.stream_ops.mmap.apply(this, arguments);
      },
      msync: function () {
        return Module.$VIRTUALFS.stream_ops.msync.apply(this, arguments);
      }
    }
  }
});
