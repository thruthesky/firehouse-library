import { Injectable } from '@angular/core';

import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase/app';
import { auth } from 'firebase/app';



/**
 * Database root collection name
 */
export const DATABASE_COLLECTION = 'swallow';
export const ERROR_EMPTY_INPUT = -1;
export const ERROR_EMPTY_EMAIL = 'empty-email';
export const ERROR_EMPTY_PASSWORD = 'empty-password';
export const ERROR_LOGIN_FIRST = 'login-first';
export const ERROR_PERMISSION_DENIED = 'permission-denied';
export const ERROR_ID_EMTPY = 'id-empty';


export const POST_DELETE = 'Post has been deleted...!';


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

export interface Post {
  category: string;   // post category. It is necessary to create.
  content: string;
  id: string;         //
  title: string;
  uid: string;        // user uid. It is necessary to create.
  delete: boolean;    // post deleted
  timestamp_create: any;    //
  timestamp_update: any;    //
}

export interface PostCreate {
  category: string;   // post category. It is necessary to create.
  content?: string;
  title?: string;
  uid: string;        // user uid. It is necessary to create.
  timestamp_create?: any;    //
}

export interface PostUpdate {
  category?: string;   // post category. It is necessary to create.
  content?: string;
  title?: string;
  delete?: boolean;
  timestamp_update?: any;    //
}


export interface PostGets {
  category?: string;
  limit?: number;
  page?: number; // begin with no 1.
  uid?: string; // search posts of the users.
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
  // authChange: Subject<firebase.User> = new Subject<firebase.User>();

  private options: Options = {
    domain: 'default-domain'
  };


  private _cursorPostGets = null;
  private postGetsPrevCategory = null;
  constructor(
    public fireAuth: AngularFireAuth,
    public db: AngularFirestore
  ) {
    //
    this.auth = fireAuth.auth;
    /**
     * @todo test
     */
    // this.auth.onAuthStateChanged(user => this.authChange.next(user));
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
  public get colUsers() {
    return this.docDomain.collection('users');
  }
  public get colPosts() {
    return this.docDomain.collection('posts');
  }
  /**
   * Returns document ref
   * @param uid user uid
   */
  public docUser(uid: string) {
    return this.colUsers.doc(uid);
  }
  /**
   * Returns document ref of the post
   * @param id post id
   */
  public docPost(id: string) {
    // if ( !id ) {
    //   throw this.error(ERROR_ID_EMTPY, 'Document ID must be provided to get a post...');
    // }
    return this.colPosts.doc(id);
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

    const ref = this.colUsers.doc(userData.uid);
    // console.log('ref: ', ref.ref.path);

    // console.log('userData: ', userData);
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
   * Returns currently login user's uid or null.
   */
  get myUid(): string {
    if (this.currentUser) {
      return this.currentUser.uid;
    } else {
      return null;
    }
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
    if (obj && obj['code'] !== void 0) {
      return true;
    }

    // if ( obj instanceof )

    return false;
  }



  /**
   * Forum related codes
   * ------------------------------------------
   */
  /**
   * Creates a post and return it.
   * @desc error will be thrown up.
   * @param post post data to create
   */
  async postCreate(post: PostCreate): Promise<Post> {
    post.timestamp_create = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await this.colPosts.add(post);
    return this.postGet(ref.id);
  }
  /**
   * Returns the post document.
   * @desc error will be thrown up.
   * @param id post id
   */
  async postGet(id): Promise<Post> {
    return <any>this.docPost(id).ref.get().then(doc => {
      if (doc) {
        const post: Post = <any>doc.data();
        post.id = id;
        return post;
      } else {
        return null;
      }
    });
  }


  get postGetsCursor(): any {
    return this._cursorPostGets;
  }
  setPostGetsCursor(doc) {
    this._cursorPostGets = doc;
  }
  resetPostGetsCursor() {
    this._cursorPostGets = null;
  }

  async postGets(options: PostGets): Promise<Array<Post>> {

    const posts: Array<Post> = [];

    if (!options.limit) {
      options.limit = 10;
    }

    if (this.postGetsPrevCategory !== options.category) {
      this.resetPostGetsCursor();
      this.postGetsPrevCategory = options.category;
    }



    let q;
    if (this.postGetsCursor) {
      q = this.colPosts.ref.where('category', '==', options.category)
        .orderBy('timestamp_create', 'desc')
        .startAfter(this.postGetsCursor)
        .limit(options.limit)
        .get()
    } else {
      q = this.colPosts.ref.where('category', '==', options.category)
        .orderBy('timestamp_create', 'desc')
        .limit(options.limit)
        .get()
    }

    return await q.then(snapshot => {
      if (snapshot.size) {
        snapshot.forEach(doc => {
          // console.log(doc.id, '=>', doc.data());
          const post: Post = <any>doc.data();
          post.uid = doc.id;
          posts.push(post);
          if (snapshot.size === posts.length) {
            this.setPostGetsCursor(doc);
          }
        });
      }
      return posts;
    })
  }


  /**
   * Updates a post partially.
   * @desc you can pass only few properties that you want to update.
   * @param id post id to update.
   * @param post post data to update. It can be a partial post data object.
   */
  async postUpdate(id: string, post: PostUpdate): Promise<Post> {
    post.timestamp_update = firebase.firestore.FieldValue.serverTimestamp();
    await this.docPost(id).update(post);
    return this.postGet(id);
  }
  /**
   * Delete a post.
   * 
   * @return Promise of Post
   *    - delete post
   *    - or errror is thown up.
   */
  async postDelete(id: string): Promise<Post> {
    const post: PostUpdate = {
      title: POST_DELETE,
      content: POST_DELETE,
      delete: true
    };
    return await this.postUpdate(id, post);
  }

}

