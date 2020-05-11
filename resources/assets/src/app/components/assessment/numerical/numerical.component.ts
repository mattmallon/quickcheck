import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';

@Component({
  selector: 'qc-numerical',
  templateUrl: './numerical.component.html',
  styleUrls: ['./numerical.component.scss']
})
export class NumericalComponent implements OnInit {
  @Input() currentQuestion;
  @Input() modalVisible;
  @Output() onAnswerSelection = new EventEmitter();

  answer = null;

  constructor(public utilitiesService: UtilitiesService) { }

  ngOnInit() {
  }

  ngOnChanges(changesObj) {
    if (changesObj.currentQuestion) {
      this.utilitiesService.formatMath();
      this.answer = null; //reset answer for new question
    }

    this.utilitiesService.setLtiHeight();
  }

  onInput() {
    var answerComplete = false;

    //ensure answer wasn't erased, and make sure 0 can be an answer
    if (this.answer || this.answer === 0) {
      answerComplete = true;
    }

    this.onAnswerSelection.emit({
      answerComplete: answerComplete,
      studentAnswer: {'numerical_answer': this.answer}
    });
  }

}
