import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'qc-qti-export',
	templateUrl: './qti-export.component.html',
	styleUrls: ['./qti-export.component.scss']
})
export class QtiExportComponent implements OnInit {
	@Input() assessmentGroups;
	@Input() isExportingQti;
	@Input() apiToken;
	@Output() onQtiExportCancel = new EventEmitter();

	assessmentList = null;
	assessments = null;
	checkAll = false;

	constructor() { }

	ngOnInit() {
	}

  ngOnChanges(changes) {
		//since assessment groups are fetched asynchronously in parent, the check
		//all functionality does not work right off the bat, requires updating
		//the bindings after the async call returns in parent
		if (changes.assessmentGroups) {
			this.toggleQtiExportCheckAll();
		}
	}

	cancelQtiExport() {
		this.isExportingQti = false;
		this.onQtiExportCancel.emit({canceled: true});
	}

	formatQtiExportData() {
		//convert from object into array
		var assessmentIds = Object.keys(this.assessmentList);
		this.assessments = [];
		for (let assessmentId of assessmentIds) {
			if (this.assessmentList[assessmentId]) {
				this.assessments.push(assessmentId);
			}
		}
	}

	toggleAssessmentExport(assessmentId) {
		if (this.assessmentList[assessmentId]) {
			this.assessmentList[assessmentId] = false;
			//unset the check all box if one of these has been unchecked
			this.checkAll = false;
		}
		else {
			this.assessmentList[assessmentId] = true;
		}
		this.formatQtiExportData();
	}

	toggleQtiExportCheckAll() {
		//reset the list
		this.assessments = []; //list of IDs that will be POSTed to endpoint
		this.assessmentList = {}; //object that determines which ones are selected

		if (this.checkAll) {
			this.checkAll = false;
		}
		else {
			this.checkAll = true;
			//add assessments back in
			for (let assessmentGroup of this.assessmentGroups) {
				for (let assessment of assessmentGroup.assessments) {
					//create an object with each of the assessment IDs as keys, so it's
					//faster to check on the page which ones have been selected or not
					var id = assessment.id.toString();
					if (!assessment.custom_activity_id) { //cannot convert custom activities into QTI
						this.assessmentList[id] = true;
					}
				}
			}
		}

		this.formatQtiExportData();
	}
}
