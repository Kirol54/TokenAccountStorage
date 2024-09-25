import {
  Field,
  SmartContract,
  state,
  State,
  Bool,
  method,
  Provable,
} from 'o1js';

export const simpleIndexes = {
  isValid: 0,
  value: 1,
  counter: 2,
  state3: 3,
  state4: 4,
  state5: 5,
  state6: 6,
  state7: 7,
};

/** Stores users data*/
export class TokenAccountStorage extends SmartContract {
  @state(Bool) isValid = State<Bool>();
  @state(Field) value = State<Field>();
  @state(Field) counter = State<Field>();
  @state(Field) state3 = State<Field>();
  @state(Field) state4 = State<Field>();
  @state(Field) state5 = State<Field>();
  @state(Field) state6 = State<Field>();
  @state(Field) state7 = State<Field>();

  @method async updateStateForValidUser() {
    this.isValid.getAndRequireEquals().assertEquals(true);
    const counter = this.counter.getAndRequireEquals();
    const value = this.value.getAndRequireEquals();
    this.counter.set(counter.add(1));
    this.value.set(Provable.if(value.equals(Field(0)), Field(3), value.mul(2)));
  }

  @method async setState3(value: Field) {
    // this.isValid.getAndRequireEquals().assertEquals(true);
    this.state3.set(value);
  }
}
