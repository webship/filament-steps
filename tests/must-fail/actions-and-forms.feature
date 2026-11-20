@must-fail
Feature: Assertions that must fail: the actions, the modals and the forms
  Each scenario asserts something that is not true on the test app. Its steps before the last one
  pass; the last one must fail, with the message its description announces and a hint. A modal is
  opened and left without its action; a form is read, never saved.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: An action the page does not offer
    Fails with: Expected the page to offer the "Publish" action. Its actions: "Delete".
    Given I am on the "Products" list
    When I search the list for "Webship Test Kettle"
    And I open "Webship Test Kettle" from the list
    Then the page should offer the "Publish" action

  Scenario: An action a row does not offer
    Fails with: Expected the "WS-TEST-0001" row to offer the "Deliver" action. It offers:
    Given I am on the "Orders" list
    When I search the list for "WS-TEST-0001"
    Then the "WS-TEST-0001" row should offer the "Deliver" action

  Scenario: A modal that was not opened
    Fails with: Expected the "Send email" modal to be open, but
    Given I am on the "Products" list
    Then the "Send email" modal should be open

  Scenario: The question of another modal
    Fails with: The open modal asks "Are you sure you would like to do this?", not "Delete everything?".
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    And I select all products on the page
    And I run the bulk action "Delete selected"
    Then the modal should ask "Delete everything?"

  Scenario: A value a field does not hold
    Fails with: The "Name" field holds "Webship Test Kettle", not "Webship Test Toaster"
    Given I am on the "Products" list
    When I search the list for "Webship Test Kettle"
    And I open "Webship Test Kettle" from the list
    Then "Name" should be set to "Webship Test Toaster"

  Scenario: A field that can be changed, taken for a read-only one
    Fails with: Expected the "Name" field to be read only, but it can be changed.
    Given I am on the "Products" list
    When I search the list for "Webship Test Kettle"
    And I open "Webship Test Kettle" from the list
    Then the "Name" field should be read only

  Scenario: A field the form does not show
    Fails with: Expected the form to show the field "Weight in grams".
    Given I am on the "Products" list
    When I create a new record from the list
    Then the form should show the field "Weight in grams"

  Scenario: A tab of the form that is not open
    Fails with: Expected the "Employment" tab to be open. The open one: "Personal".
    Given I am on the "Employees" list
    When I create a new record from the list
    Then the "Employment" tab should be open

  Scenario: A step of the wizard it is not on
    Fails with: Expected the wizard on the "Order Items" step. Its steps:
    Given I am on the "Orders" list
    When I create a new record from the list
    Then the wizard should be on the "Order Items" step

  Scenario: A property a key-value field does not hold
    Fails with: Expected "Metadata" to hold the property "desk". It holds: (none).
    Given I am on the "Employees" list
    When I create a new record from the list
    And I open the "Documents & Metadata" tab
    Then "Metadata" should hold the property "desk"

  Scenario: A file an upload field does not hold
    Fails with: Expected the "Images" field to hold "test-panel-photo.jpg". It holds: (none).
    Given I am on the "Products" list
    When I create a new record from the list
    Then the "Images" field should hold the file "test-panel-photo.jpg"

  Scenario: Rows a builder does not have
    Fails with: "Plan" has 0 rows, not 2.
    Given I am on the "Projects" list
    When I search the list for "Webship Test Project"
    And I open "Webship Test Project" from the list
    And I run the "Edit" action of the page
    And I open the "Plan" tab
    Then "Plan" should have 2 rows

  Scenario: Blocks a builder does not hold
    Fails with: The rows of "Plan" are "Milestone", not "Checkpoint".
    Given I am on the "Projects" list
    When I search the list for "Webship Test Project"
    And I open "Webship Test Project" from the list
    And I run the "Edit" action of the page
    And I open the "Plan" tab
    And I add the "Milestone" block to "Plan"
    Then the rows of "Plan" should be "Checkpoint"

  Scenario: A value a field of a row does not hold
    Fails with: "Title" in row 1 of "Plan" holds "", not "First milestone".
    Given I am on the "Projects" list
    When I search the list for "Webship Test Project"
    And I open "Webship Test Project" from the list
    And I run the "Edit" action of the page
    And I open the "Plan" tab
    And I add the "Milestone" block to "Plan"
    Then "Title" should be set to "First milestone" in row 1 of "Plan"
