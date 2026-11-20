@session
Feature: The session of the panel
  The login, the refusals and logging out are the Laravel pack's steps, which this pack loads: they
  find the panel's login form, its fields and its errors the way a person reads them.

  Scenario: A visitor is sent to the login form
    Given I am an anonymous user
    When I go to "/shop/products"
    Then I should see the login form
    And I should not be logged in

  Scenario: The administrator logs in with the form and lands on the dashboard
    When I log in as "administrator" with the login form
    Then I should be logged in as "administrator"
    And the sidebar should show "Welcome" as the current page
    And the user menu should name "administrator"
    And the user menu should offer "Sign out"

  @js-off
  Scenario: A login with an address no account has is refused under the address field
    Given I am an anonymous user
    When I log in with the email "nobody@example.com" and the password "Wrong-password-1"
    Then the "Email address" field should have the error "These credentials do not match our records."
    And I should not be logged in

  @js-off
  Scenario: The panel refuses an account it does not let in, at its login form
    Given I am an anonymous user
    When I go to "/login"
    And I fill in "Email address" with the email of "unverified"
    And I fill in "Password" with the password of "unverified"
    And I press "Sign in"
    Then the "Email address" field should have the error "These credentials do not match our records."
    And I should not be logged in

  @js-off
  Scenario: An account of the other panel that opens this one gets the 403 page
    Given I am an anonymous user
    When I go to "/app/login"
    And I fill in "Email address" with the email of "unverified"
    And I fill in "Password" with the password of "unverified"
    And I press "Sign in"
    And I go to "/app"
    Then the page heading should be "Verify your email address"
    When I go to "/shop/products"
    Then I should see the 403 error page
    And the page should not show debug information

  Scenario: An empty login form is refused by the browser before it is sent
    Given I am an anonymous user
    When I go to "/login"
    # The demo fills its own account in: empty the fields first.
    And I set "Email address" to ""
    And I set "Password" to ""
    And I press "Sign in"
    Then the "Email address" field should block submission as required
    And I should not be logged in

  Scenario: A session taken over survives a new page, and logging out ends it
    Given I am a logged in user with the "administrator" user
    When I go to "/shop/orders"
    Then I should be logged in as "administrator"
    When I log out
    Then I should see the login form
    And I should not be logged in
