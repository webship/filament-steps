@navigation
Feature: The sidebar, the pages and their headings
  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: The sidebar lists the panel's pages in their groups, with their badges
    When I go to "/"
    Then the sidebar should list "Shop Dashboard"
    And the sidebar should list "Products"
    And the sidebar should list "Employees"
    And the sidebar should not list "Settings"
    And the sidebar should show "Welcome" as the current page
    And the "Orders" item of the sidebar should show a badge
    And the "Customers" item of the sidebar should not show a badge

  Scenario: A page opened from the sidebar is marked as the current one, with its breadcrumbs
    Given I am on the "Products" list
    Then I should be on the "Products" list
    And the page heading should be "Products"
    And the breadcrumbs should read "Products › List"
    And the sidebar should show "Products" as the current page
    And the sidebar should not show "Welcome" as the current page
    When I open "HR Dashboard" from the sidebar
    Then the sidebar should show "HR Dashboard" as the current page

  Scenario: A group of the sidebar is collapsed and expanded again
    When I go to "/"
    And I collapse the "Shop" group of the sidebar
    Then the "Shop" group of the sidebar should be collapsed
    When I open "Products" from the sidebar
    Then the "Shop" group of the sidebar should be expanded
    And I should be on the "Products" list

  Scenario: A record opened from the list, and the new record's page
    Given I am on the "Products" list
    When I search the list for "Webship Test Kettle"
    And I open "Webship Test Kettle" from the list
    Then the page heading should be "Edit Webship Test Kettle"
    And the breadcrumbs should read "Products › Webship Test Kettle › Edit"
    And "Name" should be set to "Webship Test Kettle"
    And the page should offer the "Delete" action
    Given I am on the "Products" list
    When I create a new record from the list
    Then the page heading should be "Create Product"
    And the breadcrumbs should read "Products › Create"
