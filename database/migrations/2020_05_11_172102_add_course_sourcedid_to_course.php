<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddCourseSourcedidToCourse extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('course_contexts', function (Blueprint $table) {
            $table->string('lis_course_offering_sourcedid')->nullable()->default(NULL)->after('time_zone');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('course_contexts', function (Blueprint $table) {
            $table->dropColumn('lis_course_offering_sourcedid');
        });
    }
}
