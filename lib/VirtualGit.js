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
    const repoPathParsed = pathPosix.parse(repoPathParsed);
    let gitPath;
    if (repoPathParsed.base !== '.git') {
      gitPath = pathPosix.join(repoPath, '.git/');
    } else {
      gitPath = pathPosix.format(repoPathParsed);
    }
    let workPath;
    if (!pathPosix.isAbsolute(options.workPath)) {
      workPath = pathPosix.join(repoPath, workPath);
    } else {
      workPath = pathPosix.format(repoPathParsed);
    }
    this._fs.mkdirpSync(gitPath, options.mode);
    this._fs.mkdirpSync(workPath, options.mode);
  }

  clone (): Repository {

  }

  from (): Repository {

  }

}

export default VirtualGit;

export type { options };
