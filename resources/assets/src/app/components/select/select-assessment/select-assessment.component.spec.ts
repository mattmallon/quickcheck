import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectAssessmentComponent } from './select-assessment.component';

describe('SelectAssessmentComponent', () => {
  let component: SelectAssessmentComponent;
  let fixture: ComponentFixture<SelectAssessmentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SelectAssessmentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectAssessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
