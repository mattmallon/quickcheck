<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Feature;
use App\Models\CollectionFeature;
use App\Models\Collection;

class TimeoutFeature extends Command
{
    /**
    * The name and signature of the console command.
    *
    * @var string
    */
    protected $signature = 'feature:timeout {action}';

    /**
    * The console command description.
    *
    * @var string
    */
    protected $description = 'Add or remove the experimental, admin-only set feature to impose a timeout when students have made too many attempts in a short period of time (indicating they are clicking randomly through answers). Use the "add" argument to add the feature to all sets, or the "remove" argument to remove from all sets.';

    /**
    * Create a new command instance.
    *
    * @return void
    */
    public function __construct()
    {
        parent::__construct();
    }

    /**
    * Execute the console command.
    *
    * @return mixed
    */
    public function handle()
    {
        $action = $this->argument('action');
        if ($action === 'remove') {
            $this->removeFeature();
            return;
        }

        $this->addFeature();
        return 0;
    }

    private function addFeature() {
        $this->info('Adding feature...');

        $feature = Feature::create([
            'name' => config('constants.features.ATTEMPT_TIMEOUT'),
            'description' => 'When the system detects excessive attempts made by a student (more than 2 attempts in 1 minute, where at least one question has been answered per attempt, and on a graded assignment before the due date), the student will receive a 2 minute timeout, to deter random guessing of answers. An instructor previewing a quick check will not see a timeout message (unless in student view).',
            'default_state' => 'true',
            'admin_only' => 'false'
        ]);

        Collection::all()->each(function ($collection, $key) use ($feature) {
            $collectionFeature = new CollectionFeature();
            $collectionFeature->addFeature($collection->id, $feature);
        });

        $this->info('Feature added!');
    }

    private function removeFeature() {
        $this->info('Removing feature...');
        //collection feature will cascade on delete, so just delete the single Feature
        $name = config('constants.features.ATTEMPT_TIMEOUT');
        $feature = Feature::where('name', '=', $name)->firstOrFail();
        $feature->delete();
        $this->info('Feature removed.');
    }
}
