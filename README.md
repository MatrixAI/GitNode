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

---

The advanced storage datastructures for XML still has bad performance. It only maintains incremental updates for data that is appended. For any insert, the index performance degrades to O(n). Over time the index would become more slower due to random updates to the XML document, and eventually the index would need to be rebuilt from scratch to maintain performance.

It uses basically a mapping for text tokens to stable node identifiers (auto-incremented) and a mapping from stable node identifiers to pre numbers (which indicate order), and a mapping from stable node identifiers to pointers to internal XML objects. Note that this does not directly map to the on-disk representation, since updates to the on-disk representation would change structure on each update, that would invalidate all file pointers. Basically the XML or all semi-structured on disk representations are inefficient by default, and not designed for fast random access. Note that doing this actually maintains the order between pointers which is nice, but I realised that doesn't solve the memory <-> on-disk representation mapping (which almost requires a pointer that moves with a semantic file position).

In another paper, we describe a different index system. It's a hierarchal hash table. The top level is a the key specification level, which partitions nodes in the XML tree according to their key specifications. A node may match more than one key specification, then it may appear in more than one partition. The second level is the context level, which groups target nodes by their context. The third level is the key path level. The fourth level is the key value level, which groups taget nodes by equivalence classes. The equivalence classes are defined such that the nodes in a class have some key nodes which are value equivalent.

Basically this becomes like a table:

| Key Specification | Context | Key       | Value | Equivalence Class |
|-------------------|---------|-----------|-------|-------------------|
| KS1               | 0       | ISBN      | 12354 | { 1 }             |
| KS2               | 1       | firstname | Bob   | { 2 }             |
| KS2               | 1       | lastname  | Smith | { 2, 11 }         |
| KS3               | 0       | @ID       | 12343 | { 2 }             |
| KS3               | 0       | @ID       | 34253 | { 11 }            |

Where there are many contexts to one KS, and many keys to 1 one context, and many values to 1 key. And then 1 equivalence class to 1 value.

Context level appears to be some sort of hierarchy level in the tree. So basically at each level, there may be multiple path keys, that have different values. But these values may be equivalent to another value (I'm not sure what this means). These sets are called "key value sharing classes".

The KS is `{Q, {Q', [P1...Pn]}}`. Where Q is the context path, Q' the target path, and Ps are key paths. The context path identifies a set of nodes, each of which we refer to as a context node. For each context node, the key constraint must hold on the target set. An example of this is `{e, {book, {ISBN}}}`. This shows a book that is uniquely identified by the ISBN within the whole tree. Also: `{book, {_*.author, {firstname, lastname}}}` which shows that authors for a given book can be distinguished by their firstnames and lastnames. So `_` is a wildcard matching any label, while `_*` is a wildcard matching zero or more labels. It shows that the latter KS is a relative KS. So this can refer to any book node in the XML tree.

This key specification does not uniquely identify a node. Instead there may be multiple books with authors that are matched by KS1. So if we give the actual specific ISBNs, then we can match specific books with specific ISBNs, but still what if multiple books have the same ISBN. Then you have to specify something with more constraints. That would be asking for the firstname and lastname. Still at the end, there may be books with the same firstnames and lastnames.

Note that all the nodes when indexed have a document ordering number assigned to them. So the actual equivalence class number is attached to those.

Alternative to this is the usage of node descriptor table and using standard relational indexing like btrees to index the node descriptor table. But this doesn't deal with updates or document order queries or optimising the tradeoff to updates of the preorder number.

Last paper to read: http://www.vldb.org/pvldb/vol8/p986-finis.pdf

Containment labelling schemes includes Nested Intervals, Dyn-NI... etc. These label each node with a `[lower, upper]` interval or a similar combination of values. As the term "nested" alludes to, their main property is that a node's inteval is nested in the interval of its parent node. Queries can be answered by testing the intervales of the involved nodes for containment relationships. A variation of this is pre and post scheme where each node is lavelled with its pre and post order ranks. Plain nested interval and pre/post have similar, limited query capabilities. For example we cannot test the important `is_child` predicate because neither scheme allows us t o compute the distance between a node and an ancestor.

Considering updates, the mentioned schemes are staic, their fundamental problem is that each insertion or deletion requires relabeling O(n) labels on average as all interval bounds behind a newly inserted bound have to be shifted to make space. To avoid relabeling, the main idea was to use gaps, so several schemes use gaps in between labels. But they are all limited by the gap size. It has been proved that the cost of relabeling is traded for a potentially unbounded label size. That is any scheme which does not relabel existing labels upon insertion, an insertion sequence of length n exists that yields labels of size Omega(n) (lower bound). (E.Cohen Kaplan Milo, Labelling dynamic XML trees). Nested intervals are fundamentally limited in their update capabilities.

Alternative to this is path based labelling schemes which encode the path from the root down to the node into the label. Basically `1.2` means the first node, and the second node of the first. This is called the Dewey scheme. The dewey encoding is derived from the dewey decimal system. And it gives implicit ordering to the tree in document order. It appears that the interval encoding of trees also gives a similar idea to the span in opentracing, as if a span is an interval encoding of contexts in which traces/or log events occur. Thus each initial log even represents a child to a tree node, and subsequent contexts can be opened at each level to give an extra categorisation to these log events. That means for opentracing there are 2 ways to think of log events, as both time ordered events, and as a tree. In fact the tree gives more data, since an pre-ordered traversal over the tree would give a time ordered events. But this doesn't address concurrent events. In which case you would have to create a multidimensional tree, which represents concurrent spans as concurrent intervals. Intervals that don't have a defined order relative to each other. Both dewey encoding (path encoding) or interval encoding (nested intervals) can then be represented on disk or as a table of values. And of course there are adjacency lists and explicit pointers in an object database. That gives us 4 naive ways of representing trees. Adjacency list, explicit pointers, dewey encoding, or interval encoding. Weird how the index and the backing data structure is some times the same thing. Kind of like how hashtables is a backing data structure, but the indexing of it is implicit. Thus an index is a model of the original structure designed around particular query and update operations. Sometimes updating the original structure is easy but difficult for the index, while othertimes it's the otherway around.

Indexes are models: a B-Tree-Index can be seen as a model to map a key to the position of a record within a sorted array, a Hash-Index as a model to map a key to a position of a record within an unsorted array, and a BitMap-Index as a model to indicate if a data record exists or not. In this exploratory research paper, we start from this premise and posit that all existing index structures can be replaced with other types of models, including deep-learning models, which we term learned indexes. The key idea is that a model can learn the sort order or structure of lookup keys and use this signal to effectively predict the position or existence of records. - https://arxiv.org/abs/1712.01208

Ok now onto index based schemes. This means the data is different from the actual index scheme itself which is a separate data structure!

Looks like this is a more cleaned up version of the original paper: https://link.springer.com/article/10.1007/s00778-016-0436-3

"Order Indexes: supporting highly dynamic hierarchical data in relational main-memory database systems" - February 2017. But no downloads unless subscribed to springerlink.

Best survey over XML and Semistructured Data Querying: http://delivery.acm.org/10.1145/3100000/3095798/a64-baca.pdf?ip=202.171.181.68&id=3095798&acc=OPEN&key=4D4702B0C3E38B35%2E4D4702B0C3E38B35%2E4D4702B0C3E38B35%2E6D218144511F3437&CFID=839670274&CFTOKEN=32876084&__acm__=1513078294_a098f14a4df827e9723e7eb001ad47b9 It even mentions arangodb and mentions the previous order indexing system. They also mention a Delta-NI by the same system. Order trees subsume it when you don't need versions.

So we have a table like:

| ID | Key | Level | Lower | Upper |
|----|-----|-------|-------|-------|
| 0  | A   | 0     | ..... | ..... |
| 1  | B   | 1     | ..... | ..... |

The lower and upper are pointers into an order index.

This data structure can be created using a multikeyed multivalued bimap.

Conceptually the order index is a tree, represented by nested intervals. Such that the root node would be something like `[0` and `]0`. This means an opening and closing of interval of 0. Child nodes are then linked (bidirectionally) and with an increment in the interval number. Siblings on the same level also have an interval number, but they are ofset but all the left child nodes. Note that the level number is their interval number.

The index structure provide these functions:

```
l is backlink
e is entry in order index

find(l) -> e
rid(e) -> id of e's associated row
lower(e) -> whether e is a lower bound
before(e1, e2) - whether e1 is before e2 in entry order
next(e) -> next entry in entry order
ajdust_level(e) - level adjustment for e


```

Each index entry would store the rid that points back to each row or just the rid identifier which has to be mediated via a container.

The `adjust_level`, `find` and `before` differs among the 3 implementations AOTree, BOTree and OList.

Wait how does insert leaf work here when inserting in the middle? Is it done via inserting adjacent and the relocating it somewhere?

I don't understand how the opening and closing are connected to each other or how the nested interval system works.

Level adjustments this seems the most problematic issue I don't understand. It enables us to maintain level information dynamically. Adjust level is always added to the level stored in the table row. This way we avoid having to alter the table in case of range relocation; rather we update the level adjustment of the relocated range. To do this efficiently we reuse a technique we originally applied in DeltaNI: accumulation. The idea is to store a block level with each block. The level adjustment of an entry e is obtained by summing up the levels of all blocks on the path to the root block. This allows us to efficiently alter levels during a range relocation. After cropping the bound range `[a,b]`, we add the desired level delta `d` to the block level of the root blocks of that range, which effectively adds `d` to the levels of all entries within `[a, b]`. Accumulation brings along the cost that `level(a)` becomes linear in the height of the data structure. During an index scan, the level adjustment can be tracked and needs to be refreshed only when a new block starts. This yields amortized constant time for `level`. So this adjustment is kind of lazy then?

If we can see an implementation of this.

AO-Tree is using the self-balancing AVL tree. Maybe we should first try to understand this first.

Explicit parent pointers are maintained. The required algorithms navigate from bottom to the root. The `adjust_level` function sums up all the block levels on the path from an entry to the root.

LEVEL means the number of hops from root to the current node. That's what it means. Whereas the lower and upper nested interval numbers is actually flipped since the root of this tree is at the bottom when visualised as a flipped nested interval encoding of a tree. So that must mean the block level is added to the level inside the table to represent some sort of final level? The delta ni mentions the idea of an accumulation tree that accumulates a "true" key from the bottom to the root. Apparently nested intervals generalise nested sets (and zippers generalise gap buffers). They are immune to hierarchy reorganisation problems. They allow answering ancestor path hierarchal queries algorithmically without storing the hierarchy relation.

Nested sets are generalised by nested intervals. And there are variants and extensions on this.

Materialised paths or sometimes called dewey encoding is like unix filepaths. And there are extensions to this, indexes that use this are often called path indexing.

Closure table represents what exactly? Kind of reminds of an adjacency table or an adjacency matrix, but offset from the main data. Is it just a secondary adjacency matrix? Secondary adjacency list, since the system does not represent a matrix.

Also matrix encodings as well.

Also succinct encodings which often take advantage of some sort binary or mathematical pattern. Like how fenwick trees are stored as just an array of numbers. Their properties are often implicit based on their position and value.

Ok let's try to understand nested intervals again.

Ok so nested sets was simple as just each node is given 2 numbers where the number is arrived after a pre-order and post-order traversal. As you enter, you increment an opening number, and as you leave the node you also give it the closing number. In order to solve the insertion performance problem, you can use gaps. Which means instead of incrementing it just by 1, you increment it by a gap size. Then upon filling the gap, you need to patch this with a gap shifting or total gap reset strategy. This was later improved by using the nested interval strategy which instead uses rational numbers expressed as quotients. I'm not sure whether the nested intervals here is the same nested intervals in the main paper!?

Joe Celko first proposed nested sets. It appears that Vadim Tropashko first proposed nested intervals. This was later extended by Dan Hazel in 2008 using rational numbers. Comments about this approach: https://news.ycombinator.com/item?id=13517490

So this is the most recent work on nested intervals: https://arxiv.org/pdf/0806.3115.pdf

The nested intervals system presented by Dan Hazel do not appear to be used by the order index structure. In fact it's never referenced. However the order index paper authors are aware about the use of dynamic nested intervals via the use of gaps, floating point numbers and variable length records. However it appears they decided to stick to using gap nested intervals. This means it's no different from nested sets with gaps. The gaps can be selected wit the gap fill strategy, that is basically gap shift or a total gap reset. However the rational method is also very interesting, however there is one point of confusion, the way the rational keys need to have a matrix multiplication applied to the subtree movement with complexity based on the size of the subtree. However order index does it's own subtree movement which I think is not based on the size of the subtree, but I'm curious how even a GapNI would be done without resetting the subtree nodes.

One particular encoding of rational numbers in the older literature is called dyadic rational numbers. Vadim admits that nested intervals allow a certain freedom in choosing a particular encoding scheme. He also developed an encoding with farey fractions. The paper then demonstrates a maping between dyadic rational numbers and farey fractionals. I suppose Dan Hazel improved on these using his method.

W-BOX[19] uses gaps but tries to relabel only locally using weight-balanced B tree.
Nested Tree[22] uses a nested series of nested interval schemes to relabel only parts of the hierarchy during an update and is therefore comparable to gap-based schemes.
QRS[1] encoding based on floating point number pairs.
Variable-length QED[12]
Variable-length CDBS[12]
Variable-length CDQS[12]
Excel[16] is similar to CDBS.
Cohen[6] proved that any labelling scheme that is not allowed to relabel existing labels upon insertion, there will be a larger potentially unbounded label size.
Gap-based[15] - suggest to preallocate gaps in between interval bounds

It also says that "Subtree and range updates of size s always require all s labels to be altered". So since all containment based schemes suffer from the problems P2 and P3, their use in highly dynamic setting is limited. This is talking about gap based models, which is the same in the case of rational keying.

For example, GapNI in Fig. 1 is able to
insert a parent node K above D, E, and F by assigning it the
bounds [350, 950]. However, as soon as the node level [2] or
its parent [16] (Dyn-NI-Parent and Dyn-NI-Level in Fig. 6)
are to be tracked explicitly—which is necessary for many
queries (P1)—the inner node update turns expensive, as
the parent of all c children of K (D, E, and F) or the levels
of all s descendants change. Subtree and range updates of
size s always require all s labels to be altered.

Ok so for gap based schemes, you have omega children size for explicit parent pointers. And you have omega subtree size for level adjustment. And als osubtree updates always requires omega subtree size for moving from one subtree to another, because the interval that you're in is moving to a different bound.

With the usage of rational keys, you can always work out your next sibling, (extend it easily), work out your parent, and work out your children. However yes you also have the same problem with explicit level (since I don't think you can constant time work out level)... WAIT maybe you can constant time work out the level of anywhere you are. Maybe some sort of matrix manipulation. It's a loop of multiplication until the end, it is surely faster. And with parent pointers, that shouldn't be necessary, since you can always work out your parent. So explicit parent pointers are not necessary!!! Oh shit that might even be better than any schemes he's got right now!

B-Box[19] uses keyless B+trees. It derived BO-Tree. No need for level information and parent information. Parent information can be figured out direcly from rational keys. Not sure about level information except for loads of matrix calculations. It looks like it would be constant time to when the numerator goes down to 0 and when the denominator goes down to 0. So several matrix calculations, then it works, hence no need to store level information. This is better then maintaining level information for each node and requiring updates Omega(s) of the subtree size upon update, since it's always calculated when you need it. That being said caching it into the node can be useful for queries, if the calculation does take some time. I have a feeling the calculation will be a VERY fast computational loop.

Ok so I got the vectorious library and we can try try implementing it all using vectorious. Also note that on desktop we use `node-gyp` which is used to compile `nblas`. On browsers this will obviously not be available, but the vectorious automatically optimises when blas is available and still works when it doesn't exist. So we should still be good. I don't exactly know how rollup will deal with these extra libraries however. I hope the require call of nblas will just be ignored. Also I may move this data structure system to another npm package, so be composable, and this virtualgit will just load it in.

So first we need to build the rationals from the rational keying system. Just a double table first so we can index by everything.
