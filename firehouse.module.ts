import { NgModule } from '@angular/core';
import { FirehouseComponent } from './firehouse.component';

import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { FirehouseService } from './firehouse.service';
import { FirehouseTestService } from './firehouse.test.service';


@NgModule({
  imports: [
    AngularFirestoreModule, // imports firebase/firestore, only needed for database features
    AngularFireAuthModule // imports firebase/auth, only needed for auth features,
  ],
  declarations: [FirehouseComponent],
  exports: [FirehouseComponent],
  providers: [ FirehouseService, FirehouseTestService ]
})
export class FirehouseModule { }
