@panel @mail
Feature: A forgotten password on a new panel
  The panel offers the password reset (the build adds it, as the panel's documentation shows): it
  mails a link, and the link opens the form of the new password. The password is set back to the one
  the account has. The subject of the mail is the framework's own, which its releases word
  differently: "Reset your password" on a new app.

  Scenario: An account asks for a link, opens it from the mail and sets its password
    Given I am an anonymous user
    When I go to "/admin/password-reset/request"
    Then the page heading should be "Forgot password?"
    When I fill in "Email address" with the email of "administrator"
    And I press "Send email"
    Then I should see the success notification "We have emailed your password reset link."
    And an email with the subject "Reset your password" should be sent to "administrator"
    When I open the "Reset Password" link of the email to "administrator"
    Then the page heading should be "Reset your password"
    When I fill in "Password" with the password of "administrator"
    And I fill in "Confirm password" with the password of "administrator"
    And I press "Reset password"
    Then I should see the success notification "Your password has been reset."
    When I log in as "administrator" with the login form
    Then I should be logged in as "administrator"
