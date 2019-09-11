import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionTileComponent } from './collection-tile.component';

describe('CollectionTileComponent', () => {
  let component: CollectionTileComponent;
  let fixture: ComponentFixture<CollectionTileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CollectionTileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CollectionTileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
