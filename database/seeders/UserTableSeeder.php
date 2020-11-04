<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\User;
use App;

class UserTableSeeder extends Seeder {

    public function run() {
        //local testing
        if (App::environment('local')) {
            User::create(array('username' => 'testadmin', 'admin' => 'true'));
            User::create(array('username' => 'testinstructor', 'admin' => 'false'));
        }

        //for reg testing, create a default admin user; however, Canvas seems to go back and
        //forth between using the email address and a user ID. Very frustrating. So add both.
        //Also, to make things easier for debugging regression tests, allow access for devs.
        if (App::environment('reg')) {
            User::create(array('username' => 'iu.eds.test.user@gmail.com', 'admin' => 'true'));
            User::create(array('username' => '80001101342', 'admin' => 'true'));
            User::create(array('username' => 'mmallon', 'admin' => 'true'));
        }
    }
}