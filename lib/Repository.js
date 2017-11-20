// @flow

import { posix as pathPosix } from 'path';
import constants from './constants.js';
import Config from './Config.js';

type fs = Object;

class RepositoryError extends Error {

  code: number;

  constructor (code: number, message: ?string) {
    super(message);
    this.code = code;
  }
}

class Repository {

}

// Repository factory creates repositories
// Repository is its own thing
class RepositoryFactory {

  _fs: fs;

  construct (fs) {
    this._fs = fs;
  }

  // we assume the directory must not already exist
  init (path) {
    const [workPath, gitPath] = this._deriveGitAndWorkingPath(path);

    // creates the directories
    this._fs.mkdirpSync(workPath);
    this._fs.mkdirpSync(gitPath);

    const configPath = gitPath + constants.CONFIG_FILE;

    this._fs.writeFileSync(
      configPath,
      '',
      { mode: constants.CONFIG_FILE_MODE }
    );

    // inject the fs?
    // or inject the Config dependency?
    this._config = new Config(this._fs, configPath);

    // ok basically we need to represent the config file as a config object
    // and the config object as the file
    // edits to the object are propagated to the file
    // edits to the file are not (so not mmap)
    // instead serialised propagation
    // we don't have to do it the way git does it
    // so it should be fine
    // to write a serialisation logic
    // and then repeat serialise on every edit to the config object?
    // well how else to do it
    // this is like a database basically
    // atomic file writes that's all that's needed
    // we don't expect concurrent users that's all
    // however one problem is that changes to config files may be significant
    // wait no it isn't .gitconfig is not saved right?
    // remember config files are not synced, they are only local considerations
    // so it's fine
    // ok let's build a synchroniser




    // so it creates a file and then opens it
    // then git_config_open_ondisk
    // git_config_add_file_ondisk
    // it runs git_config_new (in config.c)
    // creation of the file leads to opening of the file
    // so it can be edited
    // teh git_config_new is not created on the file
    // its an independent object that's created
    // and constructed
    // suppose its related to the file in some way

    // git_config * config
    // git_config_new(&config)
    // git_config_add_file_ondisk(config, path) ...
    // do we deal with global and local config?
    // we stick with local config instead
    // and not bother with global configuration
    // the *out = config
    // so ok


  }

  _deriveGitAndWorkingPath (path): [path, path] {
    const pathObj = pathPosix.parse(path);
    if (pathObj.base === '.git') {
      return [
        pathPosix.dirname(path) + '/',
        path + '/'
      ];
    } else {
      return [
        path + '/',
        pathPosix.join(path, '.git/')
      ];
    }
  }

}

// we don't really need factory options
// we can use smart constructors for Repository

export { RepositoryFactory, Repository, RepositoryError };
