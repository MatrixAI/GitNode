# VirtualGit

Documentation
--------------

Development
-------------

To run flow type checks:

```
flow status
flow stop
```

To build this package for release:

```
npm run build
```

It will run tests, generate documentation and output multiple targets. One for browsers and one for nodejs. See `rollup.config.js` to see the target specification.

If your bundler is aware of the module field in `package.json`, you'll get the ES6 module directly.

Once you've updated the package run this:

```
npm version <update_type>
npm publish
```

---

Development of virtualgit based on isomorphic git and libgit2.

So isomorphic git starts with a git constructor that is `git()`, and it creates a "git" context object. This object essentially starts at a particular directory at the filesystem, it makes use of `fs`, and if you globally override the `fs` api it will just work. In my case, I just want `git` in-memory, so instead I want the `fs` api to be passed in instead of being expected to just exist as a global, that avoids needing to wrap things and using babel rewire. In my case, I expect to use the proper constructors that is `git = new VirtualGit`. And this object manages the state for a given directory. It make sense that we would first use that on a directory. However there are multiple ways to "construct" a git directory. We should use static methods for this. Like `VirtualGit.clone('...')` or `VirtualGit.init(...)` or `VirtualGit.from('...')`. Then it constructs the object, and there we go.

Let's look at libgit2 as well as to how it functions.

We start with `git_libgit2_init()` that acts as an object that tracks global state. Before calling any other libgit2 functions, Then you need to run `git_libgit2_shutdown()`.

```
int main (int argc, char * argv[]) {

  git_repository * repo = NULL;
  struct ops o = {
    1,
    0,
    0,
    0,
    GIT_REPOSITORY_INIT_SHARED_UMASK,
    0,
    0,
    0
  };

  git_threads_init();

  parse_opts(&o, argc, argv); // this is defined by yourself

  if (o.no_options) {
    check_lg2(git_repostory_init(&repo, o.dir, 0), "Could not initialize repository", NULL);
  } else {
    git_repository_init_options initopts = GIT_REPOSITORY_INIT_OPTIONS_INIT;
    initopts.flags = GIT_REPOSITORY_INIT_MKPATH;
    if (o.bare) {
      initopts.flags |= GIT_REPOSITORY_INIT_BARE;
    }
    if (o.template) {
      initopts.flags |= GIT_REPOSITORY_INIT_EXTERNAL_TEMPLATE;
      initopts.template = o.template;
    }
    if (o.gitdir) {
      initopts.workdir_path = o.dir;
      o.dir = o.gitdir;
    }
    if (o.shared != 0) {
      initopts.mode = o.shared;
    }
    check_lg2(git_repository_init_ext(&repo, o.dir, &initopts), "Could not initialize repoistory", NULL);
  }

  if (!o.quiet) {
    // report stuff
  }

  if (o.initial_commit) {
    create_initial_commit(repo);
    printf("Created emtpy inital commit\n");
  }

  git_repository_free(repo);
  git_threads_shutdown();

  return 0;

}
```

So the `git_libgit2_init` is in the `global.c`. But it isn't used here for some reason. There are 3 definitions of the function because of different ways of implementing it, and preprocessor macros.

I wonder why there is not call to `git_libgit2_init`? It does seem that it doesn't always need to be called, especially in the case where this repository type is just initialised directly.

The internal structure of the `struct git_repository` is at `repository.h` with:

```
git_odb - Object database
git_refb - Reference database
git_config - Config file
git_index - Index?

git_cache - Cache
git_attr_cache
git_diff_driver_registry - Diff (no need for this atm)

// pathnames to the filesystem
char * gitlink
char * gitdir
char * commondir
char * workdir
char * namespace

// identity of the git user
char * ident_name;
char * ident_email;

// some macro that creates an array type
// creates a typesafe resizable array of items
// git_array_t(int) my_ints = ...
git_array_t(git_buf) reserved_names;

// bitwise struct... booleans
unsigned is_bare;
unsigned is_worktree;

// some cache counter?
unsigned int lru_counter;

// probably for locks
git_atomic attr_session_key;

// not sure
git_cvar_value cvar_cache[GIT_CVAR_CACHE_MAX];

// not sure
git_strmap * submodule_cache;
```

Ok that gives an interesting overview over what a git repository should look like. Note that our multiple constructors need to deal with each one like this.

---

The `git_repository_init_options` is a struct that contains:

```
version,
flags -> bare or not... etc
mode
workdir_path
description
template_path
initial_head
origin_url
```

Flag options are like:

```
BARE - create a bare repo without a working directory
NO_REINIT - Return a git exists, if the repo already appears to be a git repo
NO_DOTGIT_DIR - NOrmally a .git will be appended to the repo but passing this flag prevents this behaviour
MKDIR - make the repo path and working directory (note that repopath is to .git) while working directory is just the directory containing the .git, this flag tells init to create the trailing component of the repo and workdir paths if necessary
EXTERNAL_TEMPLATE - libgit2 normally usese internal templates to initilize a repo, this flag enables external templates, looking fora template_path from the optiosn set or the ... etc
RELATIVEGITLINK - alternative workdir is specified, use relative paths for the gitdir andc core.workstree
```

We're not going to deal with these extra options, but the default set of possibilities first.

---

We can use embedded actions or the visitor pattern.

The visitor pattern allows us to have multiple semantics for the same parser.

It's also more modular.

---

TODO:

1. Expand tilde for paths in git config inclusion
2. Support conditional includes in git config
