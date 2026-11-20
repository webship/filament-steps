@panel @table @form
Feature: The resource the panel's generator made
  The notes resource, generated from its table with `make:filament-resource Note --generate`: its
  list, its form (a text, a Markdown editor, a switch, a date and time) and its actions. The three
  test notes start with "Webship note"; the note a scenario makes, it deletes again.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: The list of the notes: a search, the count, a sorting and a hidden column
    Given I am on the "Notes" list
    Then the sidebar should show "Notes" as the current page
    And the breadcrumbs should read "Notes › List"
    When I search the list for "Webship note"
    Then the list should count 3 notes
    And the "Webship note about the harbour" row should show "Jan 15, 2026 09:30:00" in the "Published at" column
    When I sort the list by "Published at" in descending order
    Then the list should be sorted by "Published at" in descending order
    And the first row of the list should be "Webship note about the market"
    And the list should not have the column "Created at"
    When I show the "Created at" column
    Then the list should have the column "Created at"
    When I hide the "Created at" column
    Then the list should not have the column "Created at"

  Scenario: A note created with its Markdown body, its switch and its date, changed, then deleted
    Given there is no "Webship note made by the suite" in the "Notes" list
    And I am on the "Notes" list
    When I create a new record from the list
    Then the page heading should be "Create Note"
    When I set "Title" to "Webship note made by the suite"
    And I set "Body" to "A **bold** line, written in Markdown."
    And I set "Is published" to "on"
    And I set "Published at" to "2026-12-01 10:30"
    And I create the record
    Then I should see the success notification "Created"
    And the page heading should be "Edit Note"
    And "Body" should be set to "A **bold** line, written in Markdown."
    And "Is published" should be set to "on"
    And "Published at" should be set to "2026-12-01 10:30"
    When I set "Is published" to "off"
    And I save the form
    Then I should see the success notification "Saved"
    And "Is published" should be set to "off"
    When I delete the record
    Then I should be on the "Notes" list
    When I search the list for "Webship note made by the suite"
    Then the list should be empty

  Scenario: The bulk delete of the list, asked and cancelled
    Given I am on the "Notes" list
    When I search the list for "Webship note"
    And I select all notes on the page
    Then the selection should read "3 records selected"
    And the bulk actions should offer "Delete selected"
    When I run the bulk action "Delete selected"
    Then the "Delete selected Notes" modal should be open
    When I cancel the modal
    Then no modal should be open
    And the list should count 3 notes
