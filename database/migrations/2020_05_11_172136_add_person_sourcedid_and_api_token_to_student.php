<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddPersonSourcedidAndApiTokenToStudent extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('lis_person_sourcedid')->nullable()->default(NULL)->after('lti_custom_user_id');
            $table->string('api_token')->nullable()->default(NULL)->after('lti_custom_user_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('lis_person_sourcedid');
            $table->dropColumn('api_token');
        });
    }
}
