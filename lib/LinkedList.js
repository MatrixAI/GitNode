// @flow

class DLinkedList<T> {

  _value : T;
  _prev: DLinkedList<T>|void;
  _next: DLinkedList<T>|void;

  constructor (value: T, prev: DLinkedList<T>|void, next: DLinkedList<T>|void) {
    this._value = value;
    this._prev = prev;
    this._next = next;
  }

  static fromArray<T> ([value, ...values]: Array<T>): DLinkedList<T> {
    const first = new DLinkedList(value);
    let prev = first;
    for (const value of values) {
      const current = new DLinkedList(value, prev);
      prev._next = current;
      prev = current;
    }
    return first;
  }

  get () {
    return this._value;
  }

  set (value) {
    this._value = value;
  }

  // setup iteration protocol
  //
  // setup ability to insert into the middle
  // and also remove itself
  // also set the first and last
  // as well?

}
