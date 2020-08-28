<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model as Eloquent;
use App\Classes\LTI\LtiContext;

class LineItem extends Eloquent {
    protected $table = 'line_items';
    protected $fillable = [
        'line_item_url',
        'label',
        'due_at',
        'score_maximum',
        'lti_custom_assignment_id'
    ];

    public function attempts() {
        return $this->hasMany('App\Models\Attempt');
    }

    public static function findByUrl($lineItemUrl)
    {
        return LineItem::where('line_item_url', $lineItemUrl)->first();
    }

    public function getAssignmentId()
    {
        return $this->lti_custom_assignment_id;
    }

    public function getDueAt()
    {
        return $this->due_at;
    }

    public function getScoreMaximum()
    {
        return $this->score_maximum;
    }

    public function getUrl()
    {
        return $this->line_item_url;
    }

    public function initialize($lineItemUrl, $dueAt = null, $assignmentId = null)
    {
        $ltiContext = new LtiContext();
        $lineItem = $ltiContext->getLineItem($lineItemUrl);
        if (!$lineItem) {
            return false;
        }

        $this->line_item_url = $lineItem['id'];
        $this->label = $lineItem['label'];
        $this->score_maximum = intval($lineItem['scoreMaximum']);
        $this->due_at = $dueAt;
        $this->lti_custom_assignment_id = $assignmentId;
        $this->save();

        return $this;
    }

    public function setDueAt($dueAt)
    {
        $this->due_at = $dueAt;
        $this->save();

        return $this;
    }

    public function setScoreMaximum($scoreMaximum)
    {
        $this->score_maximum = $scoreMaximum;
        $this->save();

        return $this;
    }
}