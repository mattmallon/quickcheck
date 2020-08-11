<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model as Eloquent;
use App\Classes\LTI\LtiContext;

class LineItem extends Eloquent {
    protected $table = 'line_items';
    protected $fillable = [
        'line_item_url',
        'label',
        'due_at'
    ];

    public function attempts() {
        return $this->hasMany('App\Models\Attempt');
    }

    public static function findByUrl($lineItemUrl)
    {
        return LineItem::where('line_item_url', $lineItemUrl)->first();
    }

    public function geturl()
    {
        return $this->line_item_url;
    }

    public function initialize($lineItemUrl, $dueAt)
    {
        $ltiContext = new LtiContext();
        $lineItem = $ltiContext->getLineItem($lineItemUrl);
        if (!$lineItem) {
            return false;
        }

        $this->line_item_url = $lineItem['id'];
        $this->label = $lineItem['label'];
        $this->due_at = $dueAt;
        $this->save();

        return $this;
    }
}