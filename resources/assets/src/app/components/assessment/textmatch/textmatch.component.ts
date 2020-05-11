import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';

@Component({
  selector: 'qc-textmatch',
  templateUrl: './textmatch.component.html',
  styleUrls: ['./textmatch.component.scss']
})
export class TextmatchComponent implements OnInit {
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

    //ensure answer wasn't erased
    if (this.answer) {
      answerComplete = true;
    }

    this.onAnswerSelection.emit({
      answerComplete: answerComplete,
      studentAnswer: {'textmatch_answer': this.answer}
    });
  }

}
