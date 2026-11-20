@table
Feature: The order of the records of a list, changed by dragging
  The brands of the demo keep an order of their own. The scenario drags one test brand above the
  other and back: the list ends in the order it had.

  Background:
    Given I am a logged in user with the "administrator" user
    And I am on the "Brands" list

  Scenario: A record dragged above another, then below it again
    When I turn reordering of the list on
    Then "Webship Brand Alpha" should come before "Webship Brand Beta" in the list
    When I move "Webship Brand Beta" above "Webship Brand Alpha" in the list
    Then "Webship Brand Beta" should come before "Webship Brand Alpha" in the list
    When I move "Webship Brand Beta" below "Webship Brand Alpha" in the list
    Then "Webship Brand Alpha" should come before "Webship Brand Beta" in the list
    When I turn reordering of the list off
    Then the list should have 10 rows
