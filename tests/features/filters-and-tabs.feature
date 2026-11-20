@table
Feature: Filters and their indicators, the tabs above a list, grouping
  Background:
    Given I am a logged in user with the "administrator" user
    And I am on the "Orders" list

  Scenario: A filter shows its indicator, and goes with it
    When I choose "Only deleted records" in the "Deleted records" filter
    Then the list should have the filter "Only deleted records"
    And the "Deleted records" filter should be set to "Only deleted records"
    And the list should not show "WS-TEST-0001"
    When I remove the filter "Only deleted records"
    Then the list should not have the filter "Only deleted records"
    When I search the list for "WS-TEST-0001"
    Then the list should count 1 order

  Scenario: Every filter removed at once
    When I choose "With deleted records" in the "Deleted records" filter
    Then the list should have the filter "With deleted records"
    When I clear all filters
    Then the list should not have the filter "With deleted records"
    And the "Deleted records" filter should be set to "Without deleted records"

  Scenario: The tabs above the list filter its rows
    Then the "All" tab of the list should be chosen
    And the "New" tab of the list should show a count
    When I search the list for "WS-TEST-0001"
    And I choose the "Processing" tab of the list
    Then the "Processing" tab of the list should be chosen
    And the list should be empty
    When I choose the "New" tab of the list
    Then the list should show "WS-TEST-0001"
    When I choose the "All" tab of the list
    Then the "All" tab of the list should be chosen

  Scenario: The rows grouped by a column, and grouped no more
    When I search the list for "WS-TEST-0001"
    And I group the list by "Order date"
    Then the list should show 1 group
    When I stop grouping the list
    Then the list should show 0 groups
    And the list should show "WS-TEST-0001"
