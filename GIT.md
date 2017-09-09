Notes about Git itself.

Git doesn't directly store content as delta-based changeset. Instead it uses a DAG.

The DAG encodes the snapshot of the filesystem, and then point to unchanged objects inside the tree where possible, while also adding new objects representing the changed files.

Each commit contains information about its ancestors. A commit in Git can have zero or many parent commits.

The result of a 3 way merge would have 3 parent. So being a tag the root of the tree would be a commit. A tree object would usually point to this commit. When multiple other nodes would also point to the tree. Such as objects for representing files. And other trees for representing other kinds of directories.

The blob object generally represents the file contents. Along with a hash.

The history of a file is linked all the way up its directory structure via nodes representing the directories to the root directory. This is then linked to a commit node. So as new commits are added that only changes parts of the directory, these commits will only have those objects pointing to it?

When a content node in the graph has the same reference identity, the 2 nodes are guaranteed to contain the same content. Allowing git to short-circuit content diffing efficiently.

When merging 2 branches we are merging the content of 2 nodes in a DAG. The DAG allows Git to easily determine common ancestors.

When a user makes a modification to a file in a git clone. The change is recorded locally first. The content changes are stored identically for each Git repository that the commit exists in. Upon the local commit (the special case) the local Git repository will create a new object representing a file for that changed file. For each directory above the changed file, a new tree object is created with a new identifier. A DAG is created starting from the newly created root tree object pointing to blobs that have not changed and referencing the newly created blob.

Inside the `.git` database, we have:

```
branches
hooks
info
logs
modules
objects
refs
COMMIT_EDITMSG
config
description
HEAD
index
packed-refs
```

And there we go!

All git objects are immutable once created.

The refs directory is the default location for storing reference pointers for both local and remote branches, tags and heads. A reference is a pointer to an object, usually of type tag or commit. References are managed outside of the object database, which allows the references change where they point to as the repository evolves. Special cases of references may point to other references such as HEAD. This is like a pointer to a pointer.

Git has a concept of a "bare" repository, which is a repository with no working directory. That is the directory is the `.git` database. The main use of this kind of repository is to create a centralised repository for contributors to push and pull from. You would use it in situations where there's no point in directly working in the working directory, then you only need a the git database. This is interesting because all of the JS git libraries function in this way, but in in-memory manner, that is their in-memory representation is just a bare repository.

The main idea is that centralised systems can accept pushes, that is the main idea is that you only accept pushes from clients that control you. Whereas when you don't control them, you voluntarily pull from them. This has an important consequence to polykey, that while you can push to keynodes that you control, or that you share with other people, you cannot do that to keynodes that you don't control, instead you can send a "PR" which means a request to pull from your keynode. That's the main idea to share secrets from mutually untrusting people. Note that Github's notion of PR is different from Github's notion of PR. Alternative to this is a manual sharing of creating a "patch" and sending that over via email for voluntary adding to their own repository. The native system in git to do this is called "request-pull".

It generates requests asking your upstream project to pull changes into their tree.

HOWEVER without a p2p network system, there's no way to automatically and safely network behind NATTED networks, which has to occur via the problem of keynodes being used by non-technical users.

2 existing attempts were gitchain and gittorrent, but both projects are abandoned. The only thing that makes sense for us is to integrate our work on haskell libp2p porting into polykey. And combine the two. However again polykey is in JS not Haskell, so there's going to be some issues with interoperability, especially for deploying to mobile networks.

There's also mango which combines Ethereum with IPFS and Git. All of this involves native code that I'd like to avoid. Would GHCJS be usable here?

Do you think a bare repository is useful here? Sure if we were working directly against the git database and sharing keys like that, but not if we want to make use of existing unix fs tools like tar to archive things up and then gpg encrypt that. So I'm not sure if a bare repository is right here.

Furthermore the usage of `git request-pull` along with a P2P library plugged in would be pretty cool, and we have to see what kind of synergy we can use from the work on Haskell LibP2P.

How `git request-pull` works is basically you specify an exclusive start commit, a url from where the receiver should pull from and an inclusive end commit. It's a bit strange that the range specifier is exclusive inclusive. When most range specifiers do inclusive exclusive. If the URL is an SSH URI, git will perform an SSH into that area and read commits to know whether that URL reall does contain the commits within the range specified. If it is a normal HTTP/HTTPS url, then the same thing occurs. So what happens if the URL doesn't contain the necessary commits, and can this be extended to other kinds of URIs, such as URIs coming from IPFS or other p2p URIs? Perhaps there needs to be an extension of that form.

Wait it still works even when the URL is wrong!? If so, why bother SSHing into the ssh URI?

Oh it does say "warning: No match for commit ... found at ....". And the command will return a non 0 exit code (1 exit code). Ok so it does check, and that's why it SSHs into it. That's interesting.

Note that there's no automatic tool for automatically consuming the output of a request-pull. Instead a request-pull output is meant to be sent via email manually, and the upstream maintainers would run other commands to pull in the relevant commits. In this sense it's not exactly automatic, but it should be possible to create a receiving command to automatically pull the request. This also depends on whether the patch was part of the command, which is done via the `-p` flag. If these are already there, it's possible to use `git am` or `git apply` to bring in these patches. But in our case, we could do it both ways, but the way without the patches would be the most safest, since it doesn't contain the actual contents. Since our keys are meant to be kept safely, having to have the patches there directly would require sending the request pull in an encrypted form. I don't think this is necessary, as you may want to do something depending on whether the user will actually want to bring in the key changes. However alternatively you can have the patches part of the message, and encrypt it at rest and send it out, so anybody and pull in the changes, or people who have the right keys can pull in the changes, thus representing a form of a dead drop.

Alternatively there's a `git format-patch` which is far more sophisticated, and is not a "request to pull", but the patch exactly. So perhaps "request to pull" can be left to `git request-pull` while `format-patch` can be used when actually doing a dead drop of keys! Unlike request-pull, there is an automatic command to bring in the patch, using `git am`.

The index file represents the staging area. So after running `git add`, the changes to files or multiple areas within a file is represented in the index to be committed together. Note that it is also possible to do partial commits such that only parts of the index is committed, and the rest is still staged but not committed. The purpose of the index or staging is allow the programmer to build up a series of changes that should be logically grouped into a change. For the purpose of polykey this may not really matter, as any change to any individual key should be immediately committed with an automatic commit message, although that can be optionally specified by the key changer.

For polykey there's not much point in being able to change the head reference other than doing repository surgery or branching. What is the unit of a repository in polykey. Because of encryption, the main idea was that each keyfile would be its own repository and maintain its own history, while the history of a keynode would be the history of changing keys. It is not yet decided whether the entire keynode should also be a repository, but it's definitely required for each keyfile to be its own repository. It's probably not a keyfile, but a key directory. Since one can place multiple files there. Branching and changing the head reference should be considered afterwards, we may not needs this much power and complexity. This does mean that if we naively create and manage the git repository database, we do end up with quite alot of git based overhead for each key directory.

There are 4 kinds of objects. A tree, a blob, a commit and a tag. A commit points to a tree and other commits.

All objects have type size and content attributes.

While git is distributed it is not yet decentralised. Adding a decentralised layer is what allows Polykey to have decentralised sharing of keys.

Git tackles the storage proble by packing objects into a compressed format and producing an index of the packed representation. The index file lists integer offsets into the packfile. But they written as base 16 hex, and both the index and packfile is binary encoded. The packfile format originally stored CRC checksums. However this resulted in undetectable corruption. Instead version 2 of the pack file includes CRC checksums of each compressed object in the index.

When doing pushes and pulls using the smart method, Git will automatically build the pack file format for network transmission rather than doing individual downloads of each object like in the dumb http method.

Our decentralisation needs to defeat NAT. Which the only foolproof method is to use a relay server. But as long as one client is outside of NAT, then it's possible to defeat NAT.

Maybe instead of libp2p we can use zerotier but we have to deal with licensing issues here. You can freely mix up Apache 2.0 code and GPLv3 code together, but the resulting software must be released as GPLv3. So using GPLv3 would mean here js-virtualgit can still be Apache 2.0 but Polykey would need to be GPLv3. If we were to use we would use `libzt`, but I think we should proceed with libp2p instead.
