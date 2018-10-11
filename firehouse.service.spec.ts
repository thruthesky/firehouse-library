import { TestBed } from '@angular/core/testing';

import { FirehouseService } from './firehouse.service';

describe('FirehouseService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FirehouseService = TestBed.get(FirehouseService);
    expect(service).toBeTruthy();
  });
});
