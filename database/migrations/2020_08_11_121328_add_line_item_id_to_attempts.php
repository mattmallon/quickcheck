<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddLineItemIdToAttempts extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('attempts', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->integer('line_item_id')->unsigned()->after('student_id')->nullable()->default(NULL);
            $table->foreign('line_item_id')->references('id')->on('line_items')->onDelete('cascade')->onUpdate('cascade');;
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('attempts', function(Blueprint $table) {
            $table->dropForeign('attempts_line_item_id_foreign');
        });

        Schema::table('attempts', function (Blueprint $table) {
            $table->dropColumn('line_item_id');
        });
    }
}
