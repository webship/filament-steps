@form
Feature: The fields of a form, a record created and deleted
  Each scenario that makes a record deletes it again: a run leaves the app as it found it.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: Every kind of field of the task form, then the task created and deleted
    Given there is no "Webship form task" in the "Tasks" list
    And I am on the "Tasks" list
    When I create a new record from the list
    Then the page heading should be "Create Task"
    And the breadcrumbs should read "Tasks › Create"
    When I set "Title" to "Webship form task"
    And I set "Project" to "Webship Test Project"
    And I set "Assignee" to "Wes Webship"
    And I set "Status" to "In Progress"
    And I set "Priority" to "High"
    And I set "Estimated hours" to "3.5"
    And I set "Due date" to "2026-12-01"
    And I set "Description" to "A task written by the suite."
    And I set "Labels" to "Bug, Feature"
    Then "Title" should be set to "Webship form task"
    And "Project" should be set to "Webship Test Project"
    And "Assignee" should be set to "Wes Webship"
    And "Status" should be set to "In Progress"
    And "Priority" should be set to "High"
    And "Estimated hours" should be set to "3.5"
    And "Due date" should be set to "2026-12-01"
    And "Description" should be set to "A task written by the suite."
    And "Labels" should be set to "Bug, Feature"
    When I create the record
    Then I should see the success notification "Created"
    And the page heading should be "Edit Webship form task"
    And "Assignee" should be set to "Wes Webship"
    And "Labels" should be set to "Bug, Feature"
    When I set "Labels" to "Feature"
    And I set "Priority" to "Low"
    And I save the form
    Then I should see the success notification "Saved"
    And "Labels" should be set to "Feature"
    When I delete the record
    Then I should be on the "Tasks" list
    When I search the list for "Webship form task"
    Then the list should be empty

  Scenario: A required field left empty keeps the form from being sent
    Given I am on the "Tasks" list
    When I create a new record from the list
    And I set "Project" to "Webship Test Project"
    And I create the record
    Then the "Title" field should block submission as required
    And the page heading should be "Create Task"

  Scenario: A value another record has is refused by the server, under its field
    Given I am on the "Products" list
    When I create a new record from the list
    And I set these fields:
      | Name                            | Webship duplicate kettle |
      | Price                           | 25                       |
      | Compare at price                | 30                       |
      | Cost per item                   | 10                       |
      | SKU (Stock Keeping Unit)        | WS-KETTLE-001            |
      | Barcode (ISBN, UPC, GTIN, etc.) | WS-0000000099            |
      | Quantity                        | 1                        |
      | Security stock                  | 0                        |
      | Publishing date                 | 2026-01-01               |
      | Product categories              | Webship Test Category    |
    And I create the record
    Then the "SKU (Stock Keeping Unit)" field should have the error "has already been taken"
    And the page heading should be "Create Product"

  Scenario: Fields a form shows as another field changes, on the tabs of the employee form
    Given there is no "Webship Form Employee" in the "Employees" list
    And I am on the "Employees" list
    When I create a new record from the list
    Then the "Personal" tab should be open
    When I set "Name" to "Webship Form Employee"
    And I set "Email" to "webship.form.employee@example.com"
    And I set "Skills" to "PHP"
    And I open the "Employment" tab
    Then the "Employment" tab should be open
    When I set "Job title" to "Tester"
    And I set "Employment type" to "Full Time"
    Then the form should show the field "Salary"
    And the form should not show the field "Hourly rate"
    When I set "Employment type" to "Contractor"
    Then the form should show the field "Hourly rate"
    And the form should not show the field "Salary"
    When I set "Hourly rate" to "45"
    And I set "Hire date" to "2026-02-02"
    And I set "Active" to "off"
    Then "Active" should be set to "off"
    When I open the "Documents & Metadata" tab
    And I add the property "desk" with the value "B7" to "Metadata"
    Then "Metadata" should hold the property "desk" with the value "B7"
    When I create the record
    Then I should see the success notification "Created"
    When I open the "Documents & Metadata" tab
    Then "Metadata" should hold the property "desk" with the value "B7"
    When I remove the property "desk" from "Metadata"
    Then "Metadata" should not hold the property "desk"
    # The employees are kept after their deletion: a deleted one is restored or deleted for good.
    When I delete the record
    Then I should be on the "Employees" list
    When I choose "Only deleted records" in the "Deleted records" filter
    And I search the list for "Webship Form Employee"
    Then the list should count 1 employee
    When I open "Webship Form Employee" from the list
    Then the page should offer the "Restore" action
    When I run the "Force delete" action of the page
    Then the "Force delete Webship Form Employee" modal should be open
    When I confirm the modal
    Then I should be on the "Employees" list
    When I clear all filters
    And I search the list for "Webship Form Employee"
    Then the list should be empty
