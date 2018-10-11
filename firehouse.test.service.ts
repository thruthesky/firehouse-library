import { Injectable } from '@angular/core';
import { Chance } from 'chance';
import {
    FirehouseService, ERROR_EMPTY_INPUT, User, ERROR_LOGIN_FIRST, ERROR_EMPTY_EMAIL, ERROR_EMPTY_PASSWORD, Post, ERROR_PERMISSION_DENIED, PostCreate
} from './firehouse.service';

@Injectable({ providedIn: 'root' })
export class FirehouseTestService {
    chance;
    constructor(
        private s: FirehouseService
    ) {
        window['st'] = this;
        s.setOptions({ domain: 'my-domain' });
        this.chance = new Chance();
    }

    log(msg) {
        console.log(`=========> `, ...msg);
    }
    success(msg) {
        console.log(`SUCCESS: `, ...msg);
    }
    failure(msg) {
        console.error(`FAILURE: msg`, ...msg);
    }

    true(re, ...msg) {
        if (re) {
            this.success(msg);
        } else {
            this.failure(msg);
        }
    }

    expectSuccess(re, ...msg) {
        if (this.s.isError(re)) {
            this.failure([`code: ${re.code} - ${re.message} - `, msg]);
        } else {
            this.success(msg);
        }
    }

    async run() {
        this.log('test::run()');
        // await this.generatePosts();
        await this.testUserRegisterLogoutLoginUpdate();
        await this.testPostCreate();
        await this.testPostList();
    }



    async testUserRegisterLogoutLoginUpdate() {

        // error test
        let re = await this.s.userRegister(undefined).catch(e => e);
        this.true(re.code === ERROR_EMPTY_INPUT, 'Expect error: Empty input test');

        re = await this.s.userRegister({ email: '', password: '' }).catch(e => e);
        this.true(re.code === ERROR_EMPTY_EMAIL, 'Expect error: Email is empty.');

        re = await this.s.userRegister({ email: 'abc', password: '' }).catch(e => e);
        this.true(re.code === ERROR_EMPTY_PASSWORD, 'Expect error: Password is empty.');


        re = await this.s.userRegister({ email: 'abc', password: 'abc' }).catch(e => e);
        this.true(re.code, re.message);

        re = await this.s.userRegister({ email: 'abc@abc.com', password: 'a' }).catch(e => e);
        this.true(re.code, re.message);

        // expect success
        const email = new Chance().email();
        const password = new Chance().string({ length: 8 });
        const form: User = {
            email: email,
            password: password,
            gender: 'M'
        };
        re = await this.s.userRegister(form).catch(e => e);
        this.true(re.code === void 0,
            `Expect success on registration with no error.
                Registered with ${email} and password: ${password} or Error code and message: coe: ${re.code}, message: ${re.message} `);

        await this.s.userLogout();

        re = await this.s.userUpdate({ mobile: '12345' }).catch(e => e);
        this.true(re.code === ERROR_LOGIN_FIRST, `Express failure: ${re.message}`);

        re = await this.s.userLogin(undefined, undefined).catch(e => e);
        this.true(re.code === ERROR_EMPTY_EMAIL, 'Expect error: Email is empty.');

        re = await this.s.userLogin('abc@abc.com', undefined).catch(e => e);
        this.true(re.code === ERROR_EMPTY_PASSWORD, 'Expect error: Password is empty.');

        // Expect wrong login information.
        re = await this.s.userLogin('abc@abc.com', 'abc').catch(e => e);
        this.true(re.code !== void 0, 'Wrong login email/password: ' + re.message);

        // Expect success on login
        const user = await this.s.userLogin(email, password).catch(e => e);
        this.true(user.code === void 0, `Success login with: ${user.email} uid: ${user.uid}`);


        /**
         * User update
         */
        re = await this.s.userUpdate({ mobile: '12345' }).catch(e => e);
        this.true(re.code === void 0, 'User update: ', re);

        const otherUid = this.s.currentUser.uid;


        /// create a new user
        const email2 = new Chance().email();
        const password2 = new Chance().string({ length: 8 });
        const form2: User = {
            email: email2,
            password: password2,
            gender: 'F'
        };
        re = await this.s.userRegister(form2).catch(e => e);
        this.true(re.code === void 0,
            `Expect success on registration other user.
                Registered with ${email} and password: ${password} or Error code and message: coe: ${re.code}, message: ${re.message} `);

        const myUid = this.s.currentUser.uid;
        this.true(otherUid !== myUid, `Expect success. My Uid is different from other Uid: ${myUid} vs ${otherUid}`);



        /// Expect permission denied error.
        /// Since user is trying steal other's data.
        re = await this.s.docUser(otherUid).update({ gender: 'U' }).catch(e => e);
        this.true(re.code === 'permission-denied',
            `Expect error of 'permission-denied' since the user is trying to edit other user's data.`);

    }


    async generatePosts() {
        // login as tester
        const userTester = { email: this.chance.email(), password: this.chance.string({ length: 10 }) };
        await this.s.userRegister(userTester);

        const arr = [];
        for( let i = 0; i < 100; i ++ ) {
            const post: PostCreate = {
                category: 'list-test',
                title: `title ${i}`,
                content: `content ${i}`,
                uid: this.s.myUid
            };
            const re = await this.s.postCreate(post);
            this.expectSuccess(re, `${i} post created`);
        }
        
        // const res = await Promise.all( arr );
    }

    async testPostCreate() {
        await this.s.userLogout();

        // post cat
        const postCat: PostCreate = {
            uid: null,
            category: 'cat',
            title: 'I am cat',
            content: 'Yeap!'
        };

        // expect error due to 'not login'
        let re = await this.s.postCreate(postCat).catch(e => e);
        this.true(re.code === ERROR_PERMISSION_DENIED, 'Expect error! User must login to create a post');

        // login as cat
        const userCat = { email: this.chance.email(), password: this.chance.string({ length: 10 }) };
        await this.s.userRegister(userCat);

        // expect error due to 'no uid'
        re = await this.s.postCreate(postCat).catch(e => e);
        this.true(re.code === ERROR_PERMISSION_DENIED, 'Expect error! uid is necessary.');

        postCat.uid = this.s.myUid;

        // expect success.
        re = await this.s.postCreate(postCat).catch(e => e);
        let cat = await this.s.postGet(re.id).catch(e => e);
        this.expectSuccess(cat, 'Got a post: ', cat);
        this.true(cat.id === re.id, 'Post id match');


        // login as dog
        const userDog = { email: this.chance.email(), password: this.chance.string({ length: 10 }) };
        await this.s.userRegister(userDog);


        const postDog: PostCreate = {
            uid: postCat.uid,       // warning: you login as dog, but using cat's uid. It's a security problem.
            category: 'dog',
            title: 'I am a dog',
            content: 'Bark! Bark!...'
        };

        // expect error due to 'wrong uid'
        re = await this.s.postCreate(postDog).catch(e => e);
        this.true(re.code === ERROR_PERMISSION_DENIED, 'Expect error! you cannot use other user uid.');

        // expect success with 'my uid'
        postDog.uid = this.s.myUid;
        re = await this.s.postCreate(postDog).catch(e => e);
        let dog = await this.s.postGet(re.id);
        this.true(cat.id !== dog.id, 'Dog post is different from Cat post!', dog);


        // expect error due to "you are trying to edit other's post"
        re = await this.s.postUpdate(cat.id, { title: 'I am DOG (2)' }).catch(e => e);
        this.true(re.code === ERROR_PERMISSION_DENIED, `Expect error! you cannot edit other's post`);


        // expect success.
        re = await this.s.postUpdate(dog.id, { title: 'DOG-2' }).catch(e => e);
        this.true(re.title === 'DOG-2', 'Title changed', re);


        // expect error due to "you are trying to edit other's post"
        re = await this.s.postDelete(cat.id).catch(e => e);
        this.true(re.code === ERROR_PERMISSION_DENIED, `Expect error! you cannot delete other's post`);


        // expect success.
        re = await this.s.postDelete(dog.id).catch(e => e);
        console.log('re: ', re);
        this.expectSuccess(re, `Post has been deleted`, re);


        // expect success
        re = await this.s.postGets({ category: 'dog', limit: 3 }).catch(e => e);
        this.expectSuccess(re, `I got cat category posts`, re);
        this.true(re.length > 0, 'Got posts');


        // expect succes but 0 result.
        re = await this.s.postGets({ category: 'wrong-category' }).catch(e => e);
        this.expectSuccess(re.limit === 0, `I got no posts`, re);

    }


    /**
     * `this.generatePosts()` are required.
     */
    async testPostList() {
        
        let re = await this.s.postGets({category: 'list-test', limit: 5}).catch(e => e);
        this.expectSuccess( re, 'Got list-test posts: ', re);



        re = await this.s.postGets({category: 'cat', limit: 1}).catch(e => e);
        this.expectSuccess( re, 'Got cat posts: ', re);

        re = await this.s.postGets({category: 'list-test', limit: 4}).catch(e => e);
        this.expectSuccess( re, 'Got list-test posts: ', re);


        re = await this.s.postGets({category: 'list-test', limit: 3}).catch(e => e);
        this.expectSuccess( re, 'Got list-test posts: ', re);

        re = await this.s.postGets({category: 'list-test', limit: 2}).catch(e => e);
        this.expectSuccess( re, 'Got list-test posts: ', re);

    }
}

