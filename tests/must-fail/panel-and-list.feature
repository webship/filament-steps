@must-fail
Feature: Assertions that must fail: the sidebar, the pages and the lists
  Each scenario asserts something that is not true on the test app. Its steps before the last one
  pass; the last one must fail, with the message its description announces and a hint. Nothing here
  changes a record, a sorting or a choice the panel keeps.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: An item the sidebar does not have
    Fails with: Expected the sidebar to list "Invoices". It lists: "Welcome"
    Given I am on the "Products" list
    Then the sidebar should list "Invoices"

  Scenario: An item the sidebar has, said to be missing
    Fails with: Expected the sidebar not to list "Products", but it does.
    Given I am on the "Products" list
    Then the sidebar should not list "Products"

  Scenario: The wrong item taken for the current page
    Fails with: Expected the sidebar to show "Orders" as the current page. The current item: "Products".
    Given I am on the "Products" list
    Then the sidebar should show "Orders" as the current page

  Scenario: A badge on an item that shows none
    Fails with: Expected the "Customers" item of the sidebar to show a badge, but it shows none
    Given I am on the "Products" list
    Then the "Customers" item of the sidebar should show a badge

  Scenario: The heading of another page
    Fails with: Expected the page heading "Orders", but it is "Products"
    Given I am on the "Products" list
    Then the page heading should be "Orders"

  Scenario: The breadcrumbs of another page
    Fails with: Expected the breadcrumbs "Orders › List", but they read "Products › List".
    Given I am on the "Products" list
    Then the breadcrumbs should read "Orders › List"

  Scenario: Another list taken for the one on screen
    Fails with: Expected the "Orders" list, but the page is "Products"
    Given I am on the "Products" list
    Then I should be on the "Orders" list

  Scenario: A record the list does not show
    Fails with: Expected the list to show "Webship Test Toaster". Its rows:
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the list should show "Webship Test Toaster"

  Scenario: A record the list shows, said to be missing
    Fails with: Expected the list not to show "Webship Test Kettle", but a row shows it.
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the list should not show "Webship Test Kettle"

  Scenario: A count the list does not have
    Fails with: The list counts 3 products, not 4
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the list should count 4 products

  Scenario: Rows the page does not have
    Fails with: The list has 3 rows on the page on screen, not 2.
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the list should have 2 rows

  Scenario: A cell that reads something else
    Fails with: The "Webship Test Kettle" row shows "Webship Brand Alpha" in the "Brand" column, not "Webship Brand Beta".
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the "Webship Test Kettle" row should show "Webship Brand Beta" in the "Brand" column

  Scenario: Another record taken for the first row
    Fails with: Expected the first row of the list to be "Webship Test Teapot", but it is "
    Given I am on the "Products" list
    When I search the list for "Webship Test Kettle"
    Then the first row of the list should be "Webship Test Teapot"

  Scenario: A list with rows taken for an empty one
    Fails with: Expected the list to be empty, but it counts 3
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the list should be empty

  Scenario: A sorting that was not chosen
    Fails with: Expected the list sorted by "Price" in descending order: the heading says "none"
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the list should be sorted by "Price" in descending order

  Scenario: A filter that is not set
    Fails with: Expected the active filter "Only deleted records". The list shows: (none).
    Given I am on the "Orders" list
    Then the list should have the filter "Only deleted records"

  Scenario: A tab of the list that is not chosen
    Fails with: Expected the "Processing" tab of the list to be chosen, but it is not chosen.
    Given I am on the "Orders" list
    Then the "Processing" tab of the list should be chosen

  Scenario: A column the list does not have
    Fails with: Expected the list to have the column "Weight". Its columns:
    Given I am on the "Products" list
    Then the list should have the column "Weight"

  Scenario: Another page of the list
    Fails with: The list is on page 1, not 2.
    Given I am on the "Products" list
    Then the list should be on page 2

  Scenario: A selection that was not made
    Fails with: Expected the selection to read "1 record selected", but it reads "(nothing selected)".
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    Then the selection should read "1 record selected"

  Scenario: A bulk action the list does not have
    Fails with: Expected the bulk actions to offer "Archive selected". They offer: "Toggle visibility", "Delete selected".
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    And I select "Webship Test Kettle" in the list
    Then the bulk actions should offer "Archive selected"

  Scenario: Groups of a list that is not grouped
    Fails with: Expected the list to show the group "New". Its groups: (none).
    Given I am on the "Orders" list
    Then the list should show the group "New"

  Scenario: A group of the sidebar taken for a collapsed one
    Fails with: Expected the "Shop" group of the sidebar to be collapsed, but it is expanded.
    Given I am on the "Products" list
    Then the "Shop" group of the sidebar should be collapsed

  Scenario: A value of a filter that is not set
    Fails with: The "Deleted records" filter is set to "Without deleted records", not "Only deleted records".
    Given I am on the "Orders" list
    Then the "Deleted records" filter should be set to "Only deleted records"

  Scenario: Two records in the other order
    Fails with: Expected "Webship Brand Beta" before "Webship Brand Alpha" in the list; they are at rows 2 and 1
    Given I am on the "Brands" list
    When I search the list for "Webship Brand"
    Then "Webship Brand Beta" should come before "Webship Brand Alpha" in the list
