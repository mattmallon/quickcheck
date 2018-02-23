@extends('layouts.master')

@section('title', 'User Not Found')

@section('content')
<main class="container-fluid">
    <div class="row">
        <div class="col-xs-12">
            <div class="alert alert-danger" role="alert">
                <p class="lead">Error: Session Not Valid</p>
                <p>If we were to hedge a guess, your session has expired due to inactivity. Please refresh the page.</p>
            </div>
        </div>
    </div>
</main>


@stop