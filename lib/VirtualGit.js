// @flow

import { posix as pathPosix } from 'path';
import Repository from './Repository.js';

// constructor functions, and then instance functions

// vg = new VirtualGit(fs);
// vg.init();
// vg.from();
// and you Repo
// vg.checkout(repo, ...);
// or
// repo.checkout(...);

// workPath is the workign directory path
// repoPath is the path to the rpo
// we'll consider that the repoPath is the workPath in this case
// because it may have a different working directory
// test if workPath is relative and attempt this

type options = {
  mode?: number,
  workdirPath?: string,
  originUrl?: string
};

class VirtualGit {

  _fs: Object;
  _gitPath: string;
  _workPath: string;
  _odb: ObjectDB;
  _refdb: ReferenceDB;

  constructor (fs: Object) {
    this._fs = fs;
  }

  init (repodirPath: string, options: options): Repository {
    const repodirPathParsed = pathPosix.parse(repodirPath);
    let gitPath;
    if (repodirPathParsed.base !== '.git') {
      gitPath = pathPosix.join(repoPath, '.git');
      repodirPathParsed = pathPosix.parse(repodirPath);
    } else {
      gitPath = repoPath;
    }
    if (!pathPosix.isAbsolute(options.workdirPath)) {
      options.workdirPath = pathPosix.join(repoPath, workPath);
    } else {
      options.workdirPath = repoPath;
    }

    // create the directories
    // is init an async thing?
    this._fs.mkdirSync(repoPath);
    this._fs.mkdirSync(options.workdirPath);

    // we can await and chian operations
    // await this._fs.mkdir(...);
    // wait can we do this on fs operations?
    // node 8 has promisify from util
    // then you can promisify(this._fs.mkdir);
    // then you can perform await readdir... etc

    // given_repo is the path
    // so this initialises an returns the real repo path and working directory path
    // repo_init_directories(&repo_path, &wd_path, given_repo, opts)
    // repo



  }

  clone (): Repository {

  }

  from (): Repository {

  }

}

export default VirtualGit;

export type { options };
