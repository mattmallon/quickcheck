import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { ErrorMessageComponent } from './components/shared/error-message/error-message.component';
import { NavComponent } from './components/shared/nav/nav.component';
import { QuickAddComponent } from './components/home/quick-add/quick-add.component';
import { CollectionIndexComponent } from './components/collection-index/collection-index.component';
import { AdminPanelComponent } from './components/collection-index/admin-panel/admin-panel.component';
import { AddCollectionComponent } from './components/collection-index/add-collection/add-collection.component';
import { AddCustomActivityComponent } from './components/collection-index/add-custom-activity/add-custom-activity.component';
import { CollectionTileComponent } from './components/collection-index/collection-tile/collection-tile.component';
import { CustomActivitiesPanelComponent } from './components/collection-index/custom-activities-panel/custom-activities-panel.component';
import { CustomActivityComponent } from './components/collection-index/custom-activity/custom-activity.component';
import { InviteAdminComponent } from './components/collection-index/invite-admin/invite-admin.component';
import { PublicCollectionsComponent } from './components/collection-index/public-collections/public-collections.component';
import { LoadingComponent } from './components/shared/loading/loading.component';
import { EditIconComponent } from './components/shared/edit-icon/edit-icon.component';
import { DeleteIconComponent } from './components/shared/delete-icon/delete-icon.component';
import { ViewAllCollectionsToggleComponent } from './components/shared/view-all-collections-toggle/view-all-collections-toggle.component';
import { ReadOnlyNoticeComponent } from './components/shared/read-only-notice/read-only-notice.component';
import { AssessmentComponent } from './components/assessment/assessment.component';
import { CheckmarkComponent } from './components/assessment/checkmark/checkmark.component';
import { CompletionModalComponent } from './components/assessment/completion-modal/completion-modal.component';
import { DropdownsComponent } from './components/assessment/dropdowns/dropdowns.component';
import { ErrorModalComponent } from './components/assessment/error-modal/error-modal.component';
import { FeedbackModalComponent } from './components/assessment/feedback-modal/feedback-modal.component';
import { MatchingComponent } from './components/assessment/matching/matching.component';
import { MatrixComponent } from './components/assessment/matrix/matrix.component';
import { MultipleChoiceComponent } from './components/assessment/multiple-choice/multiple-choice.component';
import { MultipleCorrectComponent } from './components/assessment/multiple-correct/multiple-correct.component';
import { NumericalComponent } from './components/assessment/numerical/numerical.component';
import { RowFeedbackComponent } from './components/assessment/row-feedback/row-feedback.component';
import { TextmatchComponent } from './components/assessment/textmatch/textmatch.component';
import { TimeoutModalComponent } from './components/assessment/timeout-modal/timeout-modal.component';
import { AttemptsOverviewComponent } from './components/attempts-overview/attempts-overview.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { EditAssessmentComponent } from './components/edit-assessment/edit-assessment.component';
import { CustomActivitySelectionComponent } from './components/edit-assessment/custom-activity-selection/custom-activity-selection.component';
import { CustomFeedbackComponent } from './components/edit-assessment/custom-feedback/custom-feedback.component';
import { DeleteOptionBtnComponent } from './components/edit-assessment/delete-option-btn/delete-option-btn.component';
import { EditDropdownsComponent } from './components/edit-assessment/edit-dropdowns/edit-dropdowns.component';
import { EditMatchingComponent } from './components/edit-assessment/edit-matching/edit-matching.component';
import { EditMatrixComponent } from './components/edit-assessment/edit-matrix/edit-matrix.component';
import { EditMultipleChoiceComponent } from './components/edit-assessment/edit-multiple-choice/edit-multiple-choice.component';
import { EditMultipleCorrectComponent } from './components/edit-assessment/edit-multiple-correct/edit-multiple-correct.component';
import { EditNumericalComponent } from './components/edit-assessment/edit-numerical/edit-numerical.component';
import { EditQuestionComponent } from './components/edit-assessment/edit-question/edit-question.component';
import { EditTextmatchComponent } from './components/edit-assessment/edit-textmatch/edit-textmatch.component';
import { RandomizeCheckboxComponent } from './components/edit-assessment/randomize-checkbox/randomize-checkbox.component';
import { RichContentToggleComponent } from './components/edit-assessment/rich-content-toggle/rich-content-toggle.component';
import { ToggleCorrectBtnComponent } from './components/edit-assessment/toggle-correct-btn/toggle-correct-btn.component';
import { SelectComponent } from './components/select/select.component';
import { SelectCollectionPanelComponent } from './components/select/select-collection-panel/select-collection-panel.component';
import { StudentViewComponent } from './components/student-view/student-view.component';
import { ReleasesComponent } from './components/student-view/releases/releases.component';
import { ViewAttemptsComponent } from './components/view-attempts/view-attempts.component';
import { AttemptDataComponent } from './components/view-attempts/attempt-data/attempt-data.component';
import { AutoGradeComponent } from './components/view-attempts/auto-grade/auto-grade.component';
import { GradeComponent } from './components/view-attempts/grade/grade.component';
import { QuestionAnalyticsComponent } from './components/view-attempts/question-analytics/question-analytics.component';
import { QuizAnalyticsComponent } from './components/view-attempts/quiz-analytics/quiz-analytics.component';
import { ReleaseComponent } from './components/view-attempts/release/release.component';
import { ResponsesComponent } from './components/view-attempts/responses/responses.component';
import { ViewAttemptsForStudentComponent } from './components/view-attempts-for-student/view-attempts-for-student.component';
import { StudentAnalyticsComponent } from './components/view-attempts-for-student/student-analytics/student-analytics.component';
import { StudentAssessmentAttemptsComponent } from './components/view-attempts-for-student/student-assessment-attempts/student-assessment-attempts.component';
import { ViewCollectionComponent } from './components/view-collection/view-collection.component';
import { AddAssessmentGroupComponent } from './components/view-collection/add-assessment-group/add-assessment-group.component';
import { AssessmentGroupComponent } from './components/view-collection/assessment-group/assessment-group.component';
import { FeaturesComponent } from './components/view-collection/features/features.component';
import { QtiExportComponent } from './components/view-collection/qti-export/qti-export.component';
import { QtiImportComponent } from './components/view-collection/qti-import/qti-import.component';
import { TogglePublicCollectionComponent } from './components/view-collection/toggle-public-collection/toggle-public-collection.component';
import { UsersComponent } from './components/view-collection/users/users.component';
import { ArrowDownIconComponent } from './components/shared/arrow-down-icon/arrow-down-icon.component';
import { ArrowUpIconComponent } from './components/shared/arrow-up-icon/arrow-up-icon.component';
import { CopyIconComponent } from './components/shared/copy-icon/copy-icon.component';
import { PreviewIconComponent } from './components/shared/preview-icon/preview-icon.component';

import { SafePipe } from './pipes/safe.pipe';
import { OrderByPipe } from './pipes/order-by.pipe';

import { CanDeactivateGuard } from './guards/can-deactivate-guard.service';

import { CollapseModule } from 'ngx-bootstrap/collapse';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { EditorModule } from '@tinymce/tinymce-angular';
import { RoundProgressModule } from 'angular-svg-round-progressbar';
import { UsernotfoundComponent } from './components/errors/usernotfound/usernotfound.component';
import { SessionnotvalidComponent } from './components/errors/sessionnotvalid/sessionnotvalid.component';
import { LtisessionnotvalidComponent } from './components/errors/ltisessionnotvalid/ltisessionnotvalid.component';
import { ErrorComponent } from './components/errors/error/error.component';
import { EstablishCookieTrustComponent } from './components/shared/establish-cookie-trust/establish-cookie-trust.component';
import { SelectAssessmentComponent } from './components/select/select-assessment/select-assessment.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ErrorMessageComponent,
    NavComponent,
    QuickAddComponent,
    CollectionIndexComponent,
    AdminPanelComponent,
    AddCollectionComponent,
    AddCustomActivityComponent,
    CollectionTileComponent,
    CustomActivitiesPanelComponent,
    CustomActivityComponent,
    InviteAdminComponent,
    PublicCollectionsComponent,
    LoadingComponent,
    EditIconComponent,
    DeleteIconComponent,
    ViewAllCollectionsToggleComponent,
    ReadOnlyNoticeComponent,
    AssessmentComponent,
    CheckmarkComponent,
    CompletionModalComponent,
    DropdownsComponent,
    ErrorModalComponent,
    FeedbackModalComponent,
    MatchingComponent,
    MatrixComponent,
    MultipleChoiceComponent,
    MultipleCorrectComponent,
    NumericalComponent,
    RowFeedbackComponent,
    TextmatchComponent,
    TimeoutModalComponent,
    AttemptsOverviewComponent,
    DocumentationComponent,
    EditAssessmentComponent,
    CustomActivitySelectionComponent,
    CustomFeedbackComponent,
    DeleteOptionBtnComponent,
    EditDropdownsComponent,
    EditMatchingComponent,
    EditMatrixComponent,
    EditMultipleChoiceComponent,
    EditMultipleCorrectComponent,
    EditNumericalComponent,
    EditQuestionComponent,
    EditTextmatchComponent,
    RandomizeCheckboxComponent,
    RichContentToggleComponent,
    ToggleCorrectBtnComponent,
    SelectComponent,
    SelectCollectionPanelComponent,
    StudentViewComponent,
    ReleasesComponent,
    ViewAttemptsComponent,
    AttemptDataComponent,
    AutoGradeComponent,
    GradeComponent,
    QuestionAnalyticsComponent,
    QuizAnalyticsComponent,
    ReleaseComponent,
    ResponsesComponent,
    ViewAttemptsForStudentComponent,
    StudentAnalyticsComponent,
    StudentAssessmentAttemptsComponent,
    ViewCollectionComponent,
    AddAssessmentGroupComponent,
    AssessmentGroupComponent,
    FeaturesComponent,
    QtiExportComponent,
    QtiImportComponent,
    TogglePublicCollectionComponent,
    UsersComponent,
    SafePipe,
    ArrowDownIconComponent,
    ArrowUpIconComponent,
    CopyIconComponent,
    PreviewIconComponent,
    OrderByPipe,
    UsernotfoundComponent,
    SessionnotvalidComponent,
    LtisessionnotvalidComponent,
    ErrorComponent,
    EstablishCookieTrustComponent,
    SelectAssessmentComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CollapseModule.forRoot(),
    BrowserAnimationsModule,
    ModalModule.forRoot(),
    TooltipModule.forRoot(),
    PopoverModule.forRoot(),
    EditorModule,
    RoundProgressModule,
    RouterModule
  ],
  providers: [
      HttpClientModule,
      Title,
      CanDeactivateGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
