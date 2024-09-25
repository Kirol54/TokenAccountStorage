import {
  State,
  state,
  PublicKey,
  method,
  VerificationKey,
  TokenContractV2,
  Permissions,
  Bool,
  AccountUpdate,
  AccountUpdateForest,
} from 'o1js';

import { TokenAccountStorage, simpleIndexes } from './TokenAccountStorage';

export class TokenAccountController extends TokenContractV2 {
  @state(PublicKey) admin = State<PublicKey>();

  init() {
    super.init();
    this.admin.set(this.sender.getAndRequireSignatureV2());
  }

  @method
  async approveBase(updates: AccountUpdateForest): Promise<void> {
    this.checkZeroBalanceChange(updates);
  }

  @method async addUserToGroup(vk: VerificationKey) {
    //TODO hardcode vk of interface contract
    //TODO check if that user is already a participant
    const sender = this.sender.getAndRequireSignatureV2();

    const userTokenStorage = this.internal.mint({
      address: sender,
      amount: 1,
    });
    // this.approve(userTokenStorage); // TODO: check if this is needed
    userTokenStorage.body.update.verificationKey = {
      isSome: Bool(true),
      value: vk,
    };

    userTokenStorage.body.update.permissions = {
      isSome: Bool(true),
      value: {
        ...Permissions.default(),
        editState: Permissions.proof(),
        setVerificationKey:
          Permissions.VerificationKey.impossibleDuringCurrentVersion(),
        send: Permissions.impossible(), // we don't want to allow sending - soulbound
      },
    };

    // Set valid user status
    AccountUpdate.setValue(
      userTokenStorage.body.update.appState[simpleIndexes.isValid],
      Bool(true).toField()
    );
    // userTokenStorage.body.mayUseToken =
    //   AccountUpdate.MayUseToken.InheritFromParent;

    userTokenStorage.requireSignature();
  }

  @method async updateUserCounter() {
    const sender = this.sender.getAndRequireSignatureV2();

    await new TokenAccountStorage(
      sender,
      this.deriveTokenId()
    ).updateStateForValidUser();
  }

  // @method async increaseCounterForParticipant() {
  // const sender = this.sender.getAndRequireSignatureV2();
  // const userTokenStorage = new TokenAccountStorage(
  //   sender,
  //   this.deriveTokenId()
  // );

  // const counter = userTokenStorage.counter.get();
  // const value = userTokenStorage.value.get();

  // const storageUpdate = AccountUpdate.create(sender, this.deriveTokenId());
  // storageUpdate.body.useFullCommitment = Bool(true); // why?
  // AccountUpdate.setValue(
  //   storageUpdate.body.update.appState[simpleIndexes.counter],
  //   counter.add(1)
  // );
  // AccountUpdate.setValue(
  //   storageUpdate.body.update.appState[simpleIndexes.value],
  //   Provable.if(value.equals(Field(0)), Field(3), value.mul(2))
  // );

  // await userTokenStorage.tick(
  //   counter.add(1),
  //   Provable.if(value.equals(Field(0)), Field(3), value.mul(2))
  // );
  // userTokenStorage.approve(storageUpdate);
  // }

  // @method async unvalidateUser(userPubKey: PublicKey) {
  //   //TODO caller admin, is valid for user Bool(false)
  // }
}
