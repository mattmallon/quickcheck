import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';

@Component({
  selector: 'qc-dropdowns',
  templateUrl: './dropdowns.component.html',
  styleUrls: ['./dropdowns.component.scss']
})
export class DropdownsComponent implements OnInit {
  @Input() currentQuestion;
  @Input() modalVisible;
  @Output() onAnswerSelection = new EventEmitter();

  prompts = [];
  selectableAnswers = [];

  constructor(public utilitiesService: UtilitiesService) { }

  ngOnInit() {
  }

  //use $onChanges instead of $onInit, in case component is used
  //multiple times for repeated questions of the same type
  //(necessary here because prompt/answer data specific to component logic)
  ngOnChanges(changesObj) {
    if (changesObj.currentQuestion) {
      this.initOptions();
      this.utilitiesService.formatMath();
      this.utilitiesService.setLtiHeight();
    }
  }

  getCurrentAnswers() {
    var answers = [];

    for (let prompt of this.prompts) {
      if (prompt.selected_answer) {
        var answer = {'prompt_id': prompt.id, 'answer_id': prompt.selected_answer};
        answers.push(answer);
      }
    }

    return answers;
  }

  //for accessibility, when we hide the used options in select for dropdowns, the current value becomes
  //hidden for screenreader users, so we need to set aria-described-by on the select element based on
  //the currently selected answer, but the model only gives us the id, so we need to get the text from that
  getSelectableAnswerTextById(selectedAnswerId) {
    var answerText = '';
    for (let selectableAnswer of this.selectableAnswers) {
      if (selectableAnswer.id == selectedAnswerId) {
        answerText = selectableAnswer.answer_text;
      }
    }

    return answerText;
  }

  initOptions() {
    //reset if necessary (if multiple questions of same type)
    this.prompts = [];
    this.selectableAnswers = [];

    for (let qOption of this.currentQuestion.options) {
      if (qOption.prompt_or_answer == 'prompt') {
        this.prompts.push(qOption);
      }
      else {
        this.selectableAnswers.push(qOption);
      }
    }

    //for dropdowns shuffle ONLY the selectable answers;
    //prompt order must be maintained for the structure to make sense
    //answers should always be shuffled, otherwise, answer is given away
    this.utilitiesService.shuffle(this.selectableAnswers);
  }

  isAnswerUsed(selectableAnswer) {
    if (selectableAnswer.prompt_id) {
      return true;
    }

    return false;
  }

  onAnswerSelected(prompt) {
    var studentAnswer = {'dropdown_answers': []},
      answerComplete = false;

    this.updateAnswers(prompt);
    studentAnswer.dropdown_answers = this.getCurrentAnswers();

    if (studentAnswer.dropdown_answers.length === this.prompts.length) {
      answerComplete = true;
    }

    this.onAnswerSelection.emit({
      answerComplete: answerComplete,
      studentAnswer: studentAnswer
    });
  }

  updateAnswers(prompt) {
    for (let selectableAnswer of this.selectableAnswers) {
      if (selectableAnswer.id == prompt.selected_answer) {
        //set current option as answered
        selectableAnswer.prompt_id = prompt.id;
      }
      else if (selectableAnswer.prompt_id == prompt.id) {
        //if a previously selected option with this prompt, no longer answered
        selectableAnswer.prompt_id = false;
      }
    }
  }
}
