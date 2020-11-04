<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\Feature;

class FeatureTableSeeder extends Seeder {
    public function run() {
        Feature::create([
            'name' => config('constants.features.AUTOMATIC_GRADE_PASSBACK'),
            'description' => 'When students complete an assessment, the grade will automatically be passed to the gradebook when this feature is enabled. When this feature is disabled, an instructor will have to manually grade all assignments.',
            'default_state' => 'true',
            'admin_only' => 'false'
        ]);

        Feature::create([
            'name' => config('constants.features.HIDE_EMPTY_ATTEMPTS'),
            'description' => 'If a student accesses an assessment but does not answer any questions, then their attempt will be hidden in the manage view when this feature is enabled. If this feature is disabled, all attempts will be shown in the manage view, even if the student did not answer any questions.',
            'default_state' => 'false',
            'admin_only' => 'false'
        ]);

        Feature::create([
            'name' => config('constants.features.STUDENT_VIEW_RESPONSES'),
            'description' => 'After an instructor releases assessment results to students, students will be able to see their responses to individual questions, along with the answer key, if this feature is enabled. If this feature is disabled, students will only be able to see information associated with their attempt, such as score, count correct, count incorrect, etc.',
            'default_state' => 'true',
            'admin_only' => 'false'
        ]);

        Feature::create([
            'name' => config('constants.features.ATTEMPT_TIMEOUT'),
            'description' => 'When the system detects excessive attempts made by a student (more than 2 attempts in 1 minute, where at least one question has been answered per attempt, and on a graded assignment before the due date), the student will receive a 2 minute timeout, to deter random guessing of answers. An instructor previewing a quick check will not see a timeout message (unless in student view).',
            'default_state' => 'true',
            'admin_only' => 'false'
        ]);
    }
}