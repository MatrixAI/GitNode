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

    // what is repo_path it's the o.dir being pointed to
    // repo_path is initialised by repo_init_directories
    // repo_init_directories(&repo_path, &wd_path, given_repo, opts)
    // repo_init_config(repo_path.ptr, wd, opts->flags, opts->mode)
    // config is git_config * config = NULL;
    // cfg_path is git_buf cfg_path
    // repo_dir is then repo_path.ptr
    // repo_local_config(&config, &cfg_path, NULL, repo_dir);

    // if the git dir is a separate thing
    // that is the repoPath is the path to some folder
    // while workdir path is pointing to another place
    // then the workdir has a gitlink file

    // o.dir is always then the directory that will contain .git
    // not the directory that is .git
    // while workdirpath is the path to the working directory

    // repo_path.ptr and wd are both passed as strings
    // the the init config shall initialise the repository with the given paths
    // assuming the directory is already initialised
    // ok that's what repo_init_config does
    // it also uses the opt->mode and opt->flags
    // there's stuff about setting the repoconfig bare or repositoryformatversion
    // SET_REPO_CONFIG




    // if the gitPath is different from the workPath
    // there needs to be a .gitlink to the git path
    // a gitlink is just a textlink

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
