@mail
Feature: A forgotten password, reset through the mail
  The panel of the app (/app) lets an account reset its password: it mails a link, and the link opens
  the form of the new password. The mail is read in the mailbox of the app (Mailpit), with the
  Laravel pack's mail steps. The password is set back to the one the account has, so the run leaves
  the account as it found it.

  Scenario: An account asks for a link, opens it from the mail and sets its password
    Given I am an anonymous user
    When I go to "/app/password-reset/request"
    Then the page heading should be "Forgot password?"
    When I fill in "Email address" with the email of "administrator"
    And I press "Send email"
    Then I should see the success notification "We have emailed your password reset link."
    And an email with the subject "Reset your password" should be sent to "administrator"
    And the email with the subject "Reset your password" to "administrator" should contain "This password reset link will expire in 60 minutes."
    When I open the "Reset Password" link of the email to "administrator"
    Then the page heading should be "Reset your password"
    And the "Email address" field should be read only
    When I fill in "Password" with the password of "administrator"
    And I fill in "Confirm password" with the password of "administrator"
    And I press "Reset password"
    Then I should see the success notification "Your password has been reset."
    And the page heading should be "Sign in"
    When I log in as "administrator" with the login form
    Then I should be logged in as "administrator"
