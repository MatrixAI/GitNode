// use late binding of this, and access FS using `this.FS`
// this will refer to the fully resolved `LibraryManager.library`

mergeInto(LibraryManager.library, {
  $MEMFS__deps: ['$FS'],
  $MEMFS: {
    ops_table: null,
    mount: function () {
      return Module.$VIRTUALFS.mount.apply(this, arguments);
    },
    createNode: function () {
      return Module.$VIRTUALFS.createNode.apply(this, arguments);
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
