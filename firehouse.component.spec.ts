import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FirehouseComponent } from './firehouse.component';

describe('FirehouseComponent', () => {
  let component: FirehouseComponent;
  let fixture: ComponentFixture<FirehouseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FirehouseComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FirehouseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
