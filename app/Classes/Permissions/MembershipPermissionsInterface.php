<?php

namespace App\Classes\Permissions;

interface MembershipPermissionsInterface {
    public function canUserWrite($user);
    public function canUserRead($user);
}