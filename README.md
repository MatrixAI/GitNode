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

So isomorphic git starts with a git constructor that is `git()`, and it creates a "git" context object. This object essentially starts at a particular directory at the filesystem, it makes use of `fs`, and if you globally override the `fs` api it will just work. In my case, I just want `git` in-memory, so instead I want the `fs` api to be passed in instead of being expected to just exist as a global, that avoids needing to wrap things and using babel rewire. In my case, I expect to use the proper constructors that is `git = new VirtualGit`. And this object manages the state for a given directory. It make sense that we would first use that on a directory. However there are multiple ways to "construct" a git directory. We should use static methods for this. Like `VirtualGit.clone('...')` or `VirtualGit.init(...)` or `VirtualGit.from('...')`. Then it constructs the object, and there we go.

Ok so instead of trying to create a structured index onto semi-structured data, we're just going to canonicalise the data. Nobody is going to look at the .config files within virtualgit, since they are not only private, but only in-memory too!
