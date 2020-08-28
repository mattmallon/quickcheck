<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class RemoveSourcedidAndOutcomeurlFromAttempts extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('attempts', function (Blueprint $table) {
            $table->dropColumn('lis_result_sourcedid');
            $table->dropColumn('lis_outcome_service_url');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('attempts', function (Blueprint $table) {
            $table->string('lis_result_sourcedid', 255)->nullable()->default(NULL)->after('lti_custom_section_id');
            $table->string('lis_outcome_service_url', 255)->nullable()->default(NULL)->after('lti_custom_section_id');
        });
    }
}
