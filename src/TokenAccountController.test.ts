import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  Cache,
  VerificationKey,
  Permissions,
} from 'o1js';
import { TokenAccountController } from './TokenAccountController';
import { TokenAccountStorage, simpleIndexes } from './TokenAccountStorage';

let proofsEnabled = true;

describe('TokenAccountController', () => {
  let adminAccount: Mina.TestPublicKey,
    adminKey: PrivateKey,
    userAccount: Mina.TestPublicKey,
    userKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: TokenAccountController,
    vk: VerificationKey;

  beforeAll(async () => {
    await TokenAccountController.compile({
      cache: Cache.FileSystemDefault,
    });
    const { verificationKey } = await TokenAccountStorage.compile({
      cache: Cache.FileSystemDefault,
    });
    vk = verificationKey;
    // console.log('contract compiled, vk:', vk);
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [adminAccount, userAccount] = Local.testAccounts;
    adminKey = adminAccount.key;
    userKey = userAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new TokenAccountController(zkAppAddress);

    //deploy
    const txn = await Mina.transaction(adminAccount, async () => {
      AccountUpdate.fundNewAccount(adminAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([adminKey, zkAppPrivateKey]).send();
  });

  it('mints custom token and sets Bool field on token account storage', async () => {
    const txn = await Mina.transaction(userAccount, async () => {
      AccountUpdate.fundNewAccount(userAccount);
      await zkApp.addUserToGroup(vk);
    });
    await txn.prove();
    await (await txn.sign([userKey]).send()).wait();

    let userStorage = new TokenAccountStorage(
      userAccount,
      zkApp.deriveTokenId()
    );

    const isValid = userStorage.isValid.get();
    expect(isValid?.toBoolean()).toBe(true);
    //check custom token balance
  });
  it('updates counter&value on token account storage for user', async () => {
    let userStorage = new TokenAccountStorage(
      userAccount,
      zkApp.deriveTokenId()
    );
    const txn = await Mina.transaction(userAccount, async () => {
      await zkApp.updateUserCounter();
    });
    await txn.prove();
    await (await txn.sign([userKey]).send()).wait();

    const counter = userStorage.counter.get();
    const value = userStorage.value.get();
    expect(counter.toString()).toBe('1');
    expect(value.toString()).toBe('3');
  });
  it('fails to call storage directly', async () => {
    let userStorage = new TokenAccountStorage(
      userAccount,
      zkApp.deriveTokenId()
    );
    const txn = await Mina.transaction(userAccount, async () => {
      await userStorage.setState3(Field(2));
    });
    await txn.prove();
    txn.sign([userKey]);
    await expect(txn.send()).rejects.toThrow(
      'Top-level account update can not use or pass on token permissions.'
    );
  });
  it('doesnt allow changing state without proof', async () => {
    const txn = await Mina.transaction(userAccount, async () => {
      //TODO better way to test this
      const au = AccountUpdate.createSigned(userAccount, zkApp.deriveTokenId());
      AccountUpdate.setValue(
        au.body.update.appState[simpleIndexes.value],
        Field(2)
      );
    });
    await txn.prove();
    txn.sign([userKey]);
    await expect(txn.send()).rejects.toThrow(
      'Top-level account update can not use or pass on token permissions.'
    );
  });
  //TODO test editState using signature (or are the above tests enough?)

  //test it's imposible to send custom token
  // it('doesnt allow sending the custom token', async () => {
  // await expect(
  // const txn = await Mina.transaction(userAccount, async () => {
  // AccountUpdate.fundNewAccount(userAccount);
  // zkApp.internal.send({
  //   from: userAccount,
  //   to: PrivateKey.random().toPublicKey(),
  //   amount: 1,
  // });
  // AccountUpdate.create(userAccount, zkApp.deriveTokenId()).send({
  // to: PrivateKey.random().toPublicKey(),
  // amount: 1,
  // });
  // });
  // ).rejects.toThrow();
  // await txn.prove();
  // await (await txn.sign([userKey]).send()).wait();
  // });
  //test its imposible to change verifikcation kee
});
