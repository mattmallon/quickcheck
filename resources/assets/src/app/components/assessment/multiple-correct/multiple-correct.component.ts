import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { UtilitiesService } from '../../../services/utilities.service';

@Component({
  selector: 'qc-multiple-correct',
  templateUrl: './multiple-correct.component.html',
  styleUrls: ['./multiple-correct.component.scss']
})
export class MultipleCorrectComponent implements OnInit {
  @Input() currentQuestion;
  @Input() modalVisible;
  @Output() onAnswerSelection = new EventEmitter();

  constructor(public utilitiesService: UtilitiesService) { }

  ngOnInit() {
  }

  ngOnChanges(changesObj) {
    if (changesObj.currentQuestion) {
      this.utilitiesService.formatMath();
    }

    this.utilitiesService.setLtiHeight();
  }

  onAnswerSelected(option) {
    const studentAnswer = {'mcorrect_answer_ids': []};
    let answerComplete = false;

    option.selected = !option.selected;

    for (let answerOption of this.currentQuestion.options) {
      if (answerOption.selected) {
        studentAnswer.mcorrect_answer_ids.push(answerOption.id);
      }
    }

    if (studentAnswer.mcorrect_answer_ids.length) {
      answerComplete = true;
    }

    this.onAnswerSelection.emit({
      answerComplete: answerComplete,
      studentAnswer: studentAnswer
    });
  }
}
