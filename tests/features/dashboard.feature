@widgets
Feature: The widgets of a dashboard
  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: The shop dashboard shows its stats, draws its charts and lists records in a table widget
    When I open "Shop Dashboard" from the sidebar
    Then the page heading should be "Shop Dashboard"
    And the stat "Repeat Customer Rate" should show a value
    And the stat "Revenue / Customer" should show a value
    And the page should show the widget "Customer Growth"
    And the "Customer Growth" chart should be drawn
    And the "Orders Year-over-Year" chart should be drawn
    And the page should show the widget "Flagged Orders"
    And the "Flagged Orders" widget should list 5 records
    And the page should not show the widget "Webship widget that does not exist"

  Scenario: The filters of the dashboard change what its widgets count
    When I open "Shop Dashboard" from the sidebar
    And I set "Order status" to "Processing"
    Then "Order status" should be set to "Processing"
    And the stat "Cancellation Rate" should read "0%"
    When I set "Order status" to "Cancelled"
    Then "Order status" should be set to "Cancelled"
    And the stat "Cancellation Rate" should read "100%"
    # The dashboard keeps its filters in the session: put them back.
    When I set "Order status" to ""
    Then "Order status" should be set to ""
