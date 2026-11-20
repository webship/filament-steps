@relations
Feature: The relation managers and the view page of a record
  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: An address added to a customer in a modal of its relation manager, then deleted
    Given I am on the "Customers" list
    When I search the list for "Wendy Webship"
    And I open "Wendy Webship" from the list
    Then the "Addresses" list should be empty
    When I run the "New address" action of the "Addresses" list
    Then the "Create address" modal should be open
    When I set "Street" to "1 Webship test street"
    And I set "City" to "Testville"
    And I confirm the modal
    Then I should see the success notification "Created"
    And the "Addresses" list should show "1 Webship test street"
    And the "Addresses" list should count 1 record
    When I run the "Delete" action on the "1 Webship test street" row of the "Addresses" list
    Then the "Delete address" modal should be open
    When I confirm the modal
    Then the "Addresses" list should be empty

  Scenario: The entries of a view page, and the pages of the record's sub-navigation
    Given I am on the "Posts" list
    When I search the list for "Webship test post"
    And I open "Webship test post" from the list
    Then the page heading should be "Webship test post"
    And the "View" page of the record should be the current one
    And the "Title" entry should read "Webship test post"
    And the "Author" entry should read "Webship Author"
    And the "Category" entry should read "Webship Category"
    And the "Publishing date" entry should read "Jan 10, 2026"
    And the "Content" entry should read "A post the test records write."
    When I open the "Edit" page of the record
    Then "Title" should be set to "Webship test post"
    When I open the "Comments" page of the record
    Then the page heading should be "Manage Webship test post Comments"
