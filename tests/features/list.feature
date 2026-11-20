@table
Feature: The list of a resource
  The test records all start with "Webship", so a search finds them and nothing of the app's random
  seed: three products, priced 15.00 (Teapot), 25.00 (Kettle) and 40.00 (Lantern).

  Background:
    Given I am a logged in user with the "administrator" user
    And I am on the "Products" list

  Scenario: A search finds the records it names, and counts them
    When I search the list for "Webship Test"
    Then the list should count 3 products
    And the list should have 3 rows
    And the list should show "Webship Test Kettle"
    And the list should show "Webship Test Teapot"
    And the "Webship Test Kettle" row should show "Webship Brand Alpha" in the "Brand" column
    And the "Webship Test Teapot" row should show "WS-TEAPOT-001" in the "SKU" column
    When I search the list for "Webship Test Kettle"
    Then the list should count 1 product
    And the list should not show "Webship Test Teapot"
    When I clear the search of the list
    Then the list should have 10 rows

  Scenario: A search that finds nothing shows the empty list
    When I search the list for "no record of the app has this name"
    Then the list should be empty
    And the list should count 0 products

  Scenario: Sorting by a column, both ways
    When I search the list for "Webship Test"
    And I sort the list by "Price"
    Then the list should be sorted by "Price" in ascending order
    And the first row of the list should be "Webship Test Teapot"
    And "Webship Test Kettle" should come before "Webship Test Lantern" in the list
    When I sort the list by "Price" in descending order
    Then the list should be sorted by "Price" in descending order
    And the first row of the list should be "Webship Test Lantern"
    When I sort the list by "Name"
    Then the first row of the list should be "Webship Test Kettle"

  Scenario: Columns hidden and shown with the column manager
    Then the list should have the column "SKU"
    When I hide the "SKU" column
    Then the list should not have the column "SKU"
    When I show the "SKU" column
    Then the list should have the column "SKU"

  Scenario: The pages of the list and the records per page
    When I show 5 products per page
    Then the list should have 5 rows
    And the list should be on page 1
    When I go to page 2 of the list
    Then the list should be on page 2
    And the list should have 5 rows
    When I show 10 products per page
    Then the list should have 10 rows
