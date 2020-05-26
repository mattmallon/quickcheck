<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddNonceAndResourceLinkIdToAttempt extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('attempts', function (Blueprint $table) {
            $table->string('nonce')->nullable()->default(NULL)->after('due_at');
            $table->string('resource_link_id')->nullable()->default(NULL)->after('due_at');
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
            $table->dropColumn('nonce');
            $table->dropColumn('resource_link_id');
        });
    }
}
