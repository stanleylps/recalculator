<?php
// Copy this file to config.php (same folder) and fill in your Sender API token.
// config.php is never published to GitHub and cannot be opened from a browser.
//
// Get a token in Sender: Settings > API access tokens > Create API token.
return [
    'api_token'   => 'PASTE-YOUR-SENDER-API-TOKEN-HERE',

    // The Sender group new sign-ups are added to. If no group with this name exists,
    // it is created automatically on the first sign-up.
    'group_title' => 'LearnwithStanley Calculators',

    // Optional: set a group id here to skip the lookup (e.g. 'aBcD12').
    'group_id'    => '',

    // Leave as is. Only changed for testing.
    'api_base'    => 'https://api.sender.net/v2',
];
