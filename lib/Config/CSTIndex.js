// @flow

// the CSTIndex is a virtual tree composed of sections and keys and values
// it exposes operations on the CSTIndex to add, remove and change values
// but this also means synchronising the changes to the CST itself
// change applied to the CST index is translated to changes on the CST itself through a passed in cursor
// that is the cursor is part of the index, but it supplies the corresponding change operation onto the underlying CST
//
// VirtualTree
//   VirtualSection [CST1 Section, CST2 Section... etc]
//   VirtualSection
//
// basically we will have a set of sections
// and each section will idenitfy virtual keys

type cstIndex = Map<path, cstIndexSection>;

let index = new CSTIndex;

// on encountering a new section
// what about the cursors back into CST
//
// a single cstindexsection can represent multiple cursors into the global CST
// either into the local CST or into the new cst
// section names needs to be standardised
let cursor = new SectionCursor();

let indexSection = index.get('Section1');
if (indexSection) {
  indexSection.addCursor(cursor);
} else {
  indexSection = new CSTIndexSection([cursor]);
  index.addSection('Section1', indexSection);
}

let indexSection = new CSTIndexSection();

index.addSection('Section1', indexSection);


class CSTIndex {

  _sections: Map<string, CSTIndexSection>;
  _cursors: Array<CursorTree>;

  constructor (sections = new Map, cursors = []) {
    this._sections = sections;
    this._cursors = cursors;
  }

  addCursor (cursor) {
    this._cursors.push(cursor);
  }

  // given that we may create new sections
  // it doesn't make sense for the user to provide an already created CSTIndexSection since it would not have cursors into the CST, unless the section is already part of the tree
  createSection ()

  // where do we add the section
  // and note that the CSTIndex is based on all cursors to root csts
  // so adding a section means mutating the original cst
  // also the index at which we add it matters too
  // we need an ordered dictionary for _sections
  // that can be mutated on order
  // not just string
  // aslo wait what are we saying exactly
  addSection (name: string, cursorIndex = 0) {

    // the name may already exist
    // but it's not bad to create separate sections even when it already exists
    // since this means a virtual section
    // we do not need to create a new oen

    const sectionCursor = this._cursors[cursorIndex].addSection(name);

    let sectionIndex = this._sections.get(name);
    if (!sectionIndex) {
      sectionIndex = new CSTIndexSection([sectionCursor]);
      this._sections.set(name, sectionIndex);
    } else {
      // the position of the sectionCursor
      // matters to the sectionIndex
      // because we're adding it to a particular cst
      // so if the cst is in the middle of the order of csts
      // then the sectionCursor added to the virtual section
      // needs to respect the order
      // the order of the sectionCursor matters
      // where can we derive this?
      sectionIndex.setCursor(sectionCursor, sectionCursorOrder);
    }

    // either way you must create a new one for a given CST
    // and also if it is an existing one, give back the cursor as well
    // so this cursor esesentially points to a tree
    // when this creates a new one on the concrete cst
    // a new cursor must be returend



  }

  removeSection (name: string) {

    this._sections.del(name);

  }

}

class CSTIndexSection {
  _keyValues: Map<string, CSTIndexKeyValue>;
  _cursors: Array<CursorSection>;

  addKeyValue (name: string, keyValue: CSTIndexKeyValue) {

  }

  removeKeyValue (name: string) {

  }

}

class CSTIndexKeyValue {
  _values;
  _cursors: Array<CursorKeyValue>;

  setValue () {

  }
}

