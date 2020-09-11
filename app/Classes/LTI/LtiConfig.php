<?php

namespace App\Classes\LTI;

class LtiConfig {

    private $appUrl;
    private $environment;
    private $domainUrl;
    private $launchUrl;
    private $navUrl;
    private $selectUrl;
    private $titleText;

    /************************************************************************/
    /* PUBLIC FUNCTIONS *****************************************************/
    /************************************************************************/

    public function __construct()
    {
        $this->appUrl = env('APP_URL');
        $this->environment = env('APP_ENV');
        $this->domainUrl = $this->appUrl;
        $this->launchUrl = $this->appUrl . '/index.php/assessment';
        $this->navUrl = $this->appUrl . '/index.php/home';
        $this->selectUrl = $this->appUrl . '/index.php/select';
        $this->oidcUrl = $this->appUrl . '/index.php/logininitiations';
        $this->titleText = 'Quick Check';
        if ($this->environment !== 'prod') {
            //for alternate environments, add environment name in parentheses to title
            $this->titleText .= ' (' . $this->environment . ')';
        }
        //TODO: Quick Check icon url
        $this->iconUrl = $this->appUrl . '/assets/img/rce_lti_icon.png';
        $this->selectionWidth = 550;
        $this->selectionHeight = 750;
        $this->scopes = [
            "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
            "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
            "https://purl.imsglobal.org/spec/lti-ags/scope/score",
            "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
            "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly"
        ];
    }

    /**
    * Master function to return config data
    *
    * @return DOMDocument
    */

    public function createConfigFile()
    {
        return [
            "title" => $this->titleText,
            "scopes" => $this->scopes,
            "privacy_level" => "public",
            "extensions" => [
                [
                    "platform" => "canvas.instructure.com",
                    "domain" => $this->domainUrl,
                    "tool_id" => "iu-eds-quickcheck",
                    "privacy_level" => "public",
                    "settings" => [
                        "text" => $this->titleText,
                        "icon_url" => $this->iconUrl,
                        "placements" => [
                            [
                                "text" => $this->titleText,
                                "enabled" => true,
                                "default" => "disabled",
                                "icon_url" => $this->iconUrl,
                                "placement" => "course_navigation",
                                "message_type" => "LtiResourceLinkRequest",
                                "target_link_uri" => $this->navUrl
                            ],
                            [
                                "text" => $this->titleText,
                                "enabled" => true,
                                "icon_url" => $this->iconUrl,
                                "placement" => "assignment_selection",
                                "message_type" => "LtiDeepLinkingRequest",
                                "target_link_uri" => $this->selectUrl,
                                "selection_width" => $this->selectionWidth,
                                "selection_height" => $this->selectionHeight
                            ],
                            [
                                "text" => $this->titleText,
                                "enabled" => true,
                                "icon_url" => $this->iconUrl,
                                "placement" => "link_selection",
                                "message_type" => "LtiDeepLinkingRequest",
                                "target_link_uri" => $this->selectUrl,
                                "selection_width" => $this->selectionWidth,
                                "selection_height" => $this->selectionHeight
                            ],
                            [
                                "text" => $this->titleText,
                                "enabled" => true,
                                "icon_url" => $this->iconUrl,
                                "placement" => "editor_button",
                                "message_type" => "LtiDeepLinkingRequest",
                                "target_link_uri" => $this->selectUrl,
                                "selection_width" => $this->selectionWidth,
                                "selection_height" => $this->selectionHeight
                            ]
                        ]
                    ]
                ]
            ],
            "public_jwk" => [
                "kty" => "RSA",
                "e" => "AQAB",
                "use" => "sig",
                "kid" => env('LTI_JWK_KID'),
                "alg" => "RS256",
                "n" => env('LTI_JWK_N')
            ],
            "description" => "This tool allows embedding and taking quick checks, as well as reviewing student results through the left nav.",
            "custom_fields" => [
                'custom_canvas_assignment_dueat' => '$Canvas.assignment.dueAt.iso8601',
                'custom_canvas_assignment_id' => '$Canvas.assignment.id',
                'custom_canvas_assignment_pointspossible' => '$Canvas.assignment.pointsPossible',
                'custom_canvas_assignment_title' => '$Canvas.assignment.title',
                'custom_canvas_course_id' => '$Canvas.course.id',
                'custom_canvas_coursesection_id' => '$CourseSection.sourcedId',
                'custom_canvas_section_id' => '$Canvas.course.sectionIds',
                'custom_canvas_user_id' => '$Canvas.user.id',
                'custom_canvas_user_login_id' => '$Canvas.user.loginId'
            ],
            "target_link_uri" => $this->launchUrl,
            "oidc_initiation_url" => $this->oidcUrl
        ];
    }

    /**
    * Return array of scopes in config, in case launch data is unavailable
    *
    * @return []
    */

    public function getScopes()
    {
        return $this->scopes;
    }
}