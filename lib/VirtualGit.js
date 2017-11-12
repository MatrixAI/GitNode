// @flow

import { posix as pathPosix } from 'path';
import Repository from './Repository.js';

type VirtualFS = Object;

type options = {
  mode?: number,
  workPath?: string,
  originUrl?: string
};

class VirtualGit {

  _fs: VirtualFS;
  _gitPath: string;
  _workPath: string;
  _odb: ObjectDB;
  _refdb: ReferenceDB;

  constructor (fs: VirtualFS) {
    this._fs = fs;
  }

  init (repoPath: string, options: options): Repository {
    let gitPath;
    if (pathPosix.parse(repoPath).base !== '.git') {
      gitPath = pathPosix.join(repoPath, '.git/');
    } else {
      gitPath = repoPath;
    }
    let workPath;
    if (!pathPosix.isAbsolute(options.workPath)) {
      workPath = pathPosix.join(repoPath, workPath);
    } else {
      workPath = repoPath;
    }
    // mode permissions?
    // depends on whether options.mode exists
    this._fs.mkdirpSync(gitPath, options.mode);
    this._fs.mkdirpSync(workPath, options.mode);

    // if the gitPath is different from the workPath
    // there needs to be a .gitlink to the git path

    //repo_init_directories
    // init structure
    // init config
    // create head
    // open
    // repo_init_create_origin


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
