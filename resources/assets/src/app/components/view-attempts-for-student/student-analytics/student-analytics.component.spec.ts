import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StudentAnalyticsComponent } from './student-analytics.component';

describe('StudentAnalyticsComponent', () => {
  let component: StudentAnalyticsComponent;
  let fixture: ComponentFixture<StudentAnalyticsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StudentAnalyticsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
