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

---

The git config problem is exactly: https://en.wikipedia.org/wiki/Semi-structured_data

That parsing and processing semistructured data easily and efficiently. Thus it is an indexing problem into semistructured data. Git config files are semi structured data!! Here https://jeremyronk.wordpress.com/2014/09/01/structured-semi-structured-and-unstructured-data/ it explains that formal data structures and SQL databases are structured data, while CSV, JSON and XML and of course git config + ini files are semi structured data. In this sense, I'm operating on this similar to native xml databases. Just like how jq can manipulate JSON documents without changing the structure of the data. (Actually jq can't edit things yet). This means a zipper path in the form of Baobap is kind of like an xpath query. As explained with xpath queries, one way of indexing an XML tree is to turn it into a table using ordinal indices for the paths. Like `1` and `1.1` for the child of `1` and so on. Consider what you are trying to do is similar to Xquery update facility. They even mention that doing this via XSLT is bad idea since a simple store means storing back the whole document (it's not efficient). I wonder if I can download a software to run an xquery update and see if it actually does what I think it does. Xquery has extensions into json too. This seems relevant to boomerang and isomorphic changes to different representations of the same data, while also seems relevant to Nix (and considering whether Nix is code or data), if it's code it is written and executed, whereas if it is data, it is automatically manipulated. This means even programming code is semi-structured, where the unstructuredness allows for more flexibility! XQuery update is not part of the core Xquery language, but is an add-on extension. This question also exposes this idea: https://stackoverflow.com/questions/10607429/difference-between-a-dom-tree-parsing-and-a-syntax-tree-parsing

In a way, Lisp is a better XML. It's even more extensible and less verbose. This is then explored with SXML and the EDN format. http://www.windowsdevcenter.com/pub/wlg/6021

So XPath is similar to my zipper path or JSON path... etc. Basically a dynamic expression telling a traversal system how to traverse the document. All good. But if you have prior knowledege on the kind of the queries you want to run, you can increase performance by indexing your data ahead of time and tagets fixed structured islands of data that are queried often. So you need to know both the xml data and the xpath route. Note that the commmercial option for this is MarkLogic, which is a NoSQL database for JSON, XML and RDF data. Wow that makes Marklogic really unique as a database compared to all the opensource alternatives like SQL databases which are everywhere, and simple document oriented databases.

In terms of the open source tool I want to try. That would be zorba, or libxml or libxslt (each provide libraries and command line tools).

http://www.martinbroadhurst.com/open-source-xquery-implementations.html

Zorba is not on Nixpkgs, but baseX is. libxml just offers simple xpath queries but not xquery.

Ok so baseX by default discards all indexes on each update query. They do have an optional ability to incrementally update the indexes. But this appears not to work for all of its indexes, and its description of how it works is not very illuminating. Need to ask a question on this.

I found a paper that discusses this problem of incrementally updating indexes for a XML database.

Investigations on path indexing for graph databases (2016): http://eprints.bbk.ac.uk/16329/7/16329.pdf

Semantic-based Structural and Content indexing for the efficient retrieval of queries over large XML data repositories (2014): http://homepage.cs.latrobe.edu.au/ekpardede/publication/FGCS-37.pdf

We need a selective index as we don't bother indexing the entire XML document, only specific portion of it. But our selective index is not just a path desgination over a collection, but instead recursive across all mentions of a key. That makes it kind of closer to a value index. So a value index is where you're looking for a specific value but you don't know the exact path. For example you're looking for the "LastName" property, but you don't know if you're looking for an employee, customer or some other type of contact. Ah yes, so for us, we are looking for a key property with key name of "X" under a particular section.. etc. So this seems like a value index.

http://docs.basex.org/wiki/Index#Structural_Indexes

Name index is a index to all the names of all elements and attributes. So something like `<abc></abc>`, then `abc` is the name of the element. While something like `<abc attr="value"/>` has `attr` as the name. For us we could imagine a keyvalue node as representing `<key name="abc"/>`. I'm not sure how this compares to things like `<key>name</key>`. But the whole thing might be:

```
<keyvalue>
  <key></key>
  <value></value>
</keyvalue>
```

So a name index contains statistics olike such as the number of occurence of the name.

Sometimes the index I'm looking for is also called a property index.

Xqueries when asking for the DB, you need to use: `collection("DBNAME")`, or if you want to access a document on disk, use `doc("/path/to/doc.xml")`. Ok how does this allow us to access what indexes there are?

Ok here is an example XML version of our CST:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
    <section>
        <heading>S1</heading>
        <keyvalue>
            <key>KEY</key>
            <value>VALUE 1</value>
        </keyvalue>
    </section>
    <section>
        <heading>S2</heading>
        <keyvalue>
            <key>KEY</key>
            <value>VALUE 4</value>
        </keyvalue>
    </section>
    <section>
        <heading>S1</heading>
        <keyvalue>
            <key>KEY</key>
            <value>VALUE 2</value>
        </keyvalue>
    </section>
    <section>
        <heading>S2</heading>
        <keyvalue>
            <key>KEY2</key>
            <value>VALUE 2</value>
        </keyvalue>
        <keyvalue>
            <key>PATH</key>
            <value>somepath</value>
            <root>
                <section>
                    <heading>S1</heading>
                    <keyvalue>
                        <key>KEY</key>
                        <value>VALUE 3</value>
                    </keyvalue>
                </section>
            </root>
        </keyvalue>
    </section>
</root>
```

An example query we might ask is:

```
//section[heading = "S1"]/keyvalue[key = "KEY"]/value/text()
```

This actually gives us back:

```
VALUE 1
VALUE 2
VALUE 3
```

So this shows that it's able to find all keyvalue nodes where its immediate child key node is equal to "KEY" in its value. This works even with recursion. And it doesn't show the parent keyvalue of course. However it doesn't obviously figure out the right section path, we also have a constraint on what the parent should be. Well I guess that would have to be the section name itself. You need to have special section names as well. If we do this with attributes..

Doing this well also means read locking to prevent concurrent reads of unstable state. JS can have a concurrent read occurring. But actually that's not possible, it is possible to wish for something like SELECT FOR UPDATE. We will just have to be careful here, it's not a concurrent data structure!

Cool so this works. Now I know the kind of query being used, I want to know how the indexing applies to this kind of query, and whether updates to the structure of the system will affect such indexing.

Since these xml databases are all in java or C++, I wonder if I convert my CST into some osrt of DOM structure, can I just use native javascript to query things using xpath?

I can see the optimised query that uses the index:

```
db:text("example", "S1")/parent::*:heading/parent::*:section/*:keyvalue[(*:key = "KEY")]/*:value/text()
```

This shows that it first uses text indexing on `S1`, basically looking for all nodes with `S1` as its value. Then it looks up the parent node, and then goes down, and expects a heading. This ensures that whatever that is containing the `S1` is a heading tag. That means it gets EVERYTHING that is `S1`, and then filters down to nodes that have a parent that contains a child called `heading`. Then goes to the parent again, and then looks up a `section`, then the `keyvalue` node, which then looks fora  child called `key` which has `KEY`. So the only indexing that is here is the section name itself. It doesn't index directly into `S1.KEY`. The `S1` is apparently text indexing, so indexing the internal text of any particular node. How does it decide whether to use text indexing or something else?

Using `index:texts("example")` shows all the text indexes along with their occurence. Basically if the text is under than some length, it will be stored in the text index. These are maps from a text string to some node in the XML document. I found that when the text index for S1 is small, it uses it, when the text index for KEY is smaller, it uses that instead, so it's always based on text index.

There's a thing called JXON, which allows lossless conversion between JSON and XML. And so there's a way where we can create our CST as a Javascript DOM thing and rely on JS DOM indexing and xpath utilities to query it lol. But then we are relying on the browser or library implementation rather than explicitly managing our own index. There is a npm library called jxon which can convert JSON into XML, but this conversion takes place once when we do this, and work on the XML, and on updates we have to convert it back? Or do we always go for creating the XML document directly in the parser, so we can just work on a CST expressed in XML. This would be similar to using XML as the intermediate language. And since JS has a native XML data type, this might actually make sense.

Since you need to traverse the tree, simple pointers cannnot be used, we must use baobab to represent cursors into the tree.

Note they have the similar thing to the attribute index, also count occurrence is used as simple optimisation system. Note sure what the token index is for. Apparently in HTML, multiple tokens are storedi n attribute values. A token is like a space delimited value within an attribute. So `<div class="row important">` shows 2 tokens that are within an attribute. So that's useful for CSS like queries since you need to do this often.

Ok so now that I understand text indexes, I want to know if it supports incremental index updates based on the `UPDINDEX` option. Apparently attribute index does. Actually I can imagine it working, the only problem is ordering. How does it know how to preserve the order of values, the sequence should be in XML top to bottom ordering. Are there any guarantees on the order of values? Apparently in XML it has a thing called ordering mode which can be set to ordered or unordered. In our case we want an ordered result sequence. XML has a thing called "document order", that is if the expression's order mode is "ordered", then node sequence will be returned in "document order", which is think I precisely top to bottom. We have a similar deal with our own CST. So that means an XQuery update statement that inserts a new key value pair with a matching key and parent section, after that the subsequent query will still return document order. But how does the text index deal with this?

Ok text indexes makes sense, but it only works for sections or keys, we can do something similar, where we only index sections or keys and contain baobab cursors to perform the same filtering operations. But optimisation that depends on the number of occurence for the relevant section or the relevant key. But this occurence can also be incrementally updated when a new subgraph gets injected into the CST (just by checking the contents of the subgraph or limiting what kind of subgraph can be inserted). Ok but how does document order get preserved?

Files to check in basex:

basex-core/src/main/java/org/basex/index/value/MemValues.java
basex-core/src/main/java/org/basex/index/value/MemValuesBuilder.java
basex-core/src/main/java/org/basex/index/value/DiskValuesBuilder.java
basex-core/src/main/java/org/basex/data/DataText.java
basex-core/src/main/java/org/basex/data/DiskData.java
basex-core/src/main/java/org/basex/data/MemData.java
basex-core/src/main/java/org/basex/data/MetaProp.java
basex-core/src/main/java/org/basex/data/Data.java
basex-core/src/main/java/org/basex/data/MetaData.java
basex-core/src/main/java/org/basex/query/up/primitives/db/DBOptimize.java

So we have org.basex.index.Index.java which is the public interface of an index structure. They all use cost based optimisation.

There are several implementations of this interface.

The org.basex.index.name.Names.java implements the index interface. It appears to index and organises elements or attribute names, this appears to be the text index and the attribute index. It also extends the `TokenSet`. They also have a path index, but it's probably not relevant to me atm. There's also `MemValues` which extends `ValueIndex`. org.basex.index.value.ValueIndex.java also implements the Index interface. The comment says this is the index of texts, attribute values and full text. This looks relevant. Note that it is also an abstract class, which means some child is meant to extend it and thus implement a more concrete version of it.

The MEMVALUES extends the ValueIndex, and suppose this actually implements the text index.

So right now my idea of the text index is simply:

```
{
  S1.KEY: DLINKED[VCursor, VCursor]
}
```

And you mediate the access to the tree and updates to the tree through the index. This limits the total number of operations you can do, but you get incremental index maintenance for free. However it's not free form.

```
insert node (
  <section>
    <heading>S1</heading>
    <keyvalue>
      <key>KEY</key>
      <value>VALUE NEW</value>
    </keyvalue>
  </section>
) before (//section[heading = "S1" and keyvalue[key="KEY"]])[2]
```

So here is an insertion expression that allows you to insert the given XML node right before the 2nd section. Note how you need to use `()[N]`, because the `[N]` binds more tightly then `//`. And also we are using multiple predicates instead of navigating into the actual value itself, since we want to acquire the actual section itself. This creates a new section.

Remember that xpath uses 1 based indexing.

So I noticed that basex doesn't directly mutate the original XML document, instead it works on its own database. So I think this means once you create a database with a backing document, this just means reading the document then. So what's the point of maintaining an input path? Why not just act as an "import" functionality rather than thinking it's some sort of system working against actual files. It does appear to maintain persistence across restarts though, so the data is stored in its own system. Turns out there is a `WRITEBACK` option, that enables the writing of that changes back to the input resources for updates to the main memory database.

If you have `SET WRITEBACK true`, then you can do things like (or command line with `-u` option):


Running it within basex standalone with `SET WRITEBACK true` then:

```
XQUERY insert node (<section> <heading>S1</heading> <keyvalue> <key>KEY</key> <value>VALUE NEW</value> </keyvalue> </section>) before (collection("/home/cmcdragonkai/Downloads/example.xml")//section[heading = "S1" and keyvalue[key="KEY"]])[2]
```

You cannot run them easily with one line, and it doesn't have multiline injection. Instead the GUI should do this but for some reason it doesn't. This now shows that it does in fact update the resulting file, but it doesn't do it incrementally that I was expecting, it actually canoncalises the file some what, however the rest of the structure is kept as is. It doesn't keep the same indentation and stuff, so these things are forgotten about. It even removes the original xml header.


Turns out in order to make the query use the text index you have to be explicit about the text. So this is really the optimiser's fault.

```
//section[heading/text() = "S1"]/keyvalue[key/text() = "KEY"]/value/text()
```
