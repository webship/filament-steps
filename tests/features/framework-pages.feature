@framework
Feature: The framework's pages around the panel
  The error pages, the debug page check and the health route are the Laravel pack's steps.

  @js-off
  Scenario: A record that does not exist answers with the 404 page, and no debug information
    Given I am a logged in user with the "administrator" user
    When I go to "/shop/products/999999/edit"
    Then I should see the 404 error page
    And the page should not show debug information

  Scenario: The health route answers that the app is up
    Given I am an anonymous user
    When I go to "/up"
    Then the response status code should be 200
    And I should see "Application up"
