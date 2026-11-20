@panel @session
Feature: The session of a new panel
  A new app with the panel installed the documented way: the panel is at /admin and its login page at
  /admin/login (PANEL_PATH=/admin, npm run test:panel). The login, the refusal and logging out are the
  Laravel pack's steps, which this pack loads.

  Scenario: A visitor is sent to the login form of the panel
    Given I am an anonymous user
    When I go to "/admin"
    Then I should see the login form
    And the page heading should be "Sign in"

  Scenario: The administrator logs in with the form, finds the resource, and logs out
    Given I am an anonymous user
    When I log in as "administrator" with the login form
    Then I should be logged in as "administrator"
    And the page heading should be "Dashboard"
    And the sidebar should list "Notes"
    And the user menu should offer "Sign out"
    When I log out
    Then I should not be logged in

  @js-off
  Scenario: The panel refuses an account whose address is not verified
    Given I am an anonymous user
    When I go to "/admin/login"
    And I fill in "Email address" with the email of "unverified"
    And I fill in "Password" with the password of "unverified"
    And I press "Sign in"
    Then the "Email address" field should have the error "These credentials do not match our records."
    And I should not be logged in
