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
        $this->iconUrl = "https://toolfinder.eds.iu.edu/storage/thumbnails/whg61rklT43ZvK3T4rZZ70reFfX8djh3akfSkkot.png";
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
            "scopes" => [
                "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
                "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
                "https://purl.imsglobal.org/spec/lti-ags/scope/score",
                "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
                "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly"
            ],
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
                                "icon_url" => $this->iconUrl,
                                "placement" => "link_selection",
                                "message_type" => "LtiDeepLinkingRequest",
                                "target_link_uri" => $this->selectUrl
                            ],
                            [
                                "text" => $this->titleText,
                                "enabled" => true,
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
                                "target_link_uri" => $this->launchUrl
                            ]
                        ],
                        "selection_width" => "1000",
                        "selection_height" => "1000"
                    ]
                ]
            ],
            "public_jwk" => [
                "kty" => "RSA",
                "e" => "AQAB",
                "use" => "sig",
                "kid" => "1d350b99-bc40-4d91-bc49-5e7afea46604",
                "alg" => "RS256",
                "n" => "lOsBNJtvRhg9JUXYB7FKp9Uso95v_jU4DeRW-Qn0jXmRGDOPqkSYvFI0NNERRsceTy0PSltr7iF9E1-Jm24CDHgBn7wpWqRkG04YLy4zPMawScffEJLpWA1O2X0ssSuAxXE1M0KxjTLWBb3WJR69yxczxLaOu7UiINoGxDscR6VD6cs_rJbc9cIGK6FB1PdQm-ZZvMtVpg1-g3cWjoHznYHSnZf0fPsaqA-0CBpKfbL-VpK4TOkJxYbydESlQgbX97FteeZkX1RXMt1zlFMHfKJ5n3BsSM10dgfKtuw6E-WMuQfJmvBzQgoSnfjZhBwulyGPqUwaSy5FCBgrQIrmqw"
            ],
            "description" => "This tool allows embedding and taking quick checks, as well as reviewing student results through the left nav.",
            "custom_fields" => [
                'custom_canvas_assignment_dueat' => '$Canvas.assignment.dueAt',
                'custom_canvas_course_id' => '$Canvas.course.id',
                'custom_canvas_courseSection_id' => '$CourseSection.sourcedId',
                'custom_canvas_section_id' => '$Canvas.course.sectionIds',
                'custom_canvas_user_id' => '$Canvas.user.id',
                'custom_canvas_user_login_id' => '$Canvas.user.loginId'
            ],
            "target_link_uri" => $this->launchUrl,
            "oidc_initiation_url" => $this->oidcUrl
        ];
    }
}