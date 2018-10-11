import { Injectable } from '@angular/core';

import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase/app';
import { auth } from 'firebase/app';
import { Subject } from 'rxjs';


/**
 * Database root collection name
 */
export const DATABASE_COLLECTION = 'swallow';
export const ERROR_EMPTY_INPUT = -1;
export const ERROR_EMPTY_EMAIL = 'empty-email';
export const ERROR_EMPTY_PASSWORD = 'empty-password';
export const ERROR_LOGIN_FIRST = 'login-first';

export interface Error {
  code: string;
  message: string;
}

export interface User {
  uid?: string;
  email?: string;
  password?: string;
  name?: string;
  nickname?: string;
  gender?: 'M' | 'F';
  birthday?: string;
  mobile?: string;
}

export interface Options {
  domain: string;
}


@Injectable()
export class FirehouseService {

  /**
   * @todo test
   */
  auth: firebase.auth.Auth;

  /**
   * @deprecated Do not use this event since it does not give any improvement in coding.
   *  Once you subscribe, you have to un-subscribe.
   *  Then what's the difference beteween this and using authUserChanged?
   *
   * @desc This is needed because if you call `onAuthStateChanged`,
   *  you have to clean or it will be left on memory as closure
   *  and it will be invoked again on auth state changes and leave as memory leak.
   * So the clean way to to observe here once and use it every where.
   *
   * @desc WARNING: it must be Subject observble. So it will only fire when auth changes.
   *  Even though you are going subscribe this, it will not fire until auth changes.
   * @example
   *
        this.firehouse.authChange.subscribe( user => {
            this.render();
        });
   */
  authChange: Subject<firebase.User> = new Subject<firebase.User>();

  private options: Options = {
    domain: 'default-domain'
  };
  constructor(
    public fireAuth: AngularFireAuth,
    public db: AngularFirestore
  ) {
    //
    this.auth = fireAuth.auth;
    /**
     * @todo test
     */
    this.auth.onAuthStateChanged( user => this.authChange.next( user ) );
  }

  public setOptions(options: Options) {
    Object.assign(this.options, options);
  }
  public error(code, message) {
    return { code: code, message: message };
  }

  public get docDomain() {
    return this.db.collection(DATABASE_COLLECTION).doc(this.options.domain);
  }
  public get colUser() {
    return this.docDomain.collection('users');
  }
  /**
   * Returns document ref
   * @param uid user uid
   */
  public docUser(uid: string) {
    return this.colUser.doc(uid);
  }

  /**
   * Register into firebase authentication using email and password.
   * @see https://github.com/angular/angularfire2/blob/master/docs/auth/getting-started.md
   * @example @see https://github.com/thruthesky/firehouse/blob/master/projects/firehouse/src/lib/firehouse.test.service.ts
   * @param user UserRegister data
   *
   * @return A promise of user data on success.
   *    Or an error will be thrown.
   *
   * @desc A thrown error will always have 'code' and 'message' properties.
   * @example
   *      const re = await this.s.userRegister(form).catch(e => e);
   *      if ( re.code === void 0 ) { ... errror ... }
   */
  public async userRegister(user: User): Promise<firebase.UserInfo> {
    console.log('userRegister() => ', user);

    if (user === void 0) {
      console.log('user is void');
      throw this.error(ERROR_EMPTY_INPUT, 'User object is empty.');
    }
    if (user.email === void 0 || typeof user.email !== 'string' || !user.email) {
      throw this.error(ERROR_EMPTY_EMAIL, 'Email is empty.');
    }
    if (user.password === void 0 || typeof user.password !== 'string' || !user.password) {
      throw this.error(ERROR_EMPTY_PASSWORD, 'Password is empty');
    }

    const re: firebase.auth.UserCredential = await this.fireAuth.auth.createUserWithEmailAndPassword(user.email, user.password);


    const userData: User = Object.assign({}, user);
    // delete userData['email'];
    delete userData['password'];

    userData.uid = re.user.uid;

    const ref = this.colUser.doc(userData.uid);
    console.log('ref: ', ref.ref.path);

    console.log('userData: ', userData);
    await ref.set(userData);

    return re.user;
  }


  public async userLogout(): Promise<void> {
    return await this.fireAuth.auth.signOut();
  }

  public async userLogin(email: string, password: string): Promise<firebase.UserInfo> {
    if (email === void 0 || typeof email !== 'string' || !email) {
      throw this.error(ERROR_EMPTY_EMAIL, 'Email is empty.');
    }
    if (password === void 0 || typeof password !== 'string' || !password) {
      throw this.error(ERROR_EMPTY_PASSWORD, 'Password is empty');
    }
    const credential = await this.fireAuth.auth.signInWithEmailAndPassword(email, password);
    return credential.user;
  }

  /**
   * It updates part of user profile data.
   * Only specified properties will be updated and whole user profile data will be returned.
   * @param user User profile data
   * @return whole user profile data from firestore /user-profile doc.
   *
   * @example how to handle error
   *    const e = await this.s.docUser(otherUid).update({ gender: 'U' }).catch( e => e );
   */
  public async userUpdate(user: User): Promise<User> {
    if (!this.fireAuth.auth.currentUser) {
      throw this.error(ERROR_LOGIN_FIRST, 'User is not logged in');
    }

    /**
     * @desc error concern. if update fails, it will just throw out of the function!!
     */
    await this.docUser(this.currentUser.uid).update(user);
    return await this.userGet(this.currentUser.uid);
  }

  async userGet(uid: string): Promise<User> {
    return await <any>this.docUser(uid).ref.get()
      .then(doc => {
        if (doc.exists) {
          return doc.data();
        } else {
          return null;
        }
      });
  }


  get currentUser(): firebase.UserInfo {
    return this.fireAuth.auth.currentUser;
  }

  /**
   * @todo need test
   */
  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  /**
   * @todo test
   */
  get isLoggedOut() {
    return !this.isLoggedIn;
  }

  /**
   * Returns true if the input is an error object.
   * @param obj error object
   * @todo test
   */
  isError(obj) {
    return obj && obj['code'] !== void 0;
  }
}

