// @flow

// these things needs to be renamed
// we cannot use the same constant names
// initiating a directory

export default Object.freeze({
  // repository
  REPO_VERSION: 0,
  // .git directory
  GIT_DIR: '.git',
  GIT_DIR_MODE: 0o755,
  // config
  CONFIG_FILE: 'config',
  CONFIG_FILE_MODE: 0o666,
  // heads
  HEAD_FILE: 'HEAD',
  // index
  INDEX_FILE: 'index',
  INDEX_FILE_MODE: 0o666,
  // refs
  REFS_DIR: 'refs/',
  REFS_DIR_MODE: 0o777,
  get REFS_HEADS_DIR () {
    return this.REFS_DIR + 'heads/';
  },
  get REFS_TAGS_DIR () {
    return this.REFS_DIR + 'tags/';
  },
  get REFS_REMOTES_DIR () {
    return this.REFS_DIR + 'remotes/';
  },
  get REFS_NOTES_DIR () {
    return this.REFS_DIR + 'notes/';
  },
  get REFS_HEADS_DIR () {
    return this.REFS_DIR + 'heads/';
  }
});
