@form @notifications
Feature: A wizard with a repeater, and the notifications the panel keeps
  Making an order sends its maker a notification that the panel keeps in its drawer. The demo keeps a
  deleted order: the scenario deletes the order it made, then deletes it for good, and clears the
  drawer.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: An order made step by step, its notification in the drawer, and the order deleted for good
    When I go to "/"
    And I clear the notifications drawer
    Then the notifications drawer should be empty
    When I close the notifications drawer
    And I open "Orders" from the sidebar
    And I create a new record from the list
    Then the wizard should be on the "Order Details" step
    And the "Number" field should be read only
    When I set "Customer" to "Wendy Webship"
    And I go to the next step of the wizard
    Then the wizard should be on the "Order Details" step
    And I should see "The status field is required."
    When I set "Status" to "New"
    And I go to the next step of the wizard
    Then the wizard should be on the "Order Items" step
    And "Order items" should have 1 row
    When I set "Product" to "Webship Test Kettle" in row 1 of "Order items"
    And I set "Quantity" to "2" in row 1 of "Order items"
    Then "Product" should be set to "Webship Test Kettle" in row 1 of "Order items"
    When I add a row to "Order items"
    Then "Order items" should have 2 rows
    When I set "Product" to "Webship Test Teapot" in row 2 of "Order items"
    And I remove row 2 of "Order items"
    Then "Order items" should have 1 row
    When I go back to the previous step of the wizard
    Then the wizard should be on the "Order Details" step
    When I go to the next step of the wizard
    And I create the record
    Then I should see the success notification "Created"
    When I open the notifications drawer
    Then the notifications drawer should list "New order"
    And the notifications button should show 1 unread
    When I mark all notifications as read
    Then the notifications button should show 0 unread
    And the notifications drawer should list "New order"
    When I clear the notifications drawer
    Then the notifications drawer should be empty
    When I close the notifications drawer
    And I delete the record
    Then I should be on the "Orders" list
    When I choose "Only deleted records" in the "Deleted records" filter
    And I search the list for "Wendy Webship"
    And I sort the list by "Order date" in descending order
    Then the list should show "Wendy Webship"
    When I open "Wendy Webship" from the list
    Then the page should offer the "Restore" action
    When I run the "Force delete" action of the page
    And I confirm the modal
    Then I should be on the "Orders" list
    When I clear all filters
    And I search the list for "Wendy Webship"
    Then the list should show "WS-TEST-0001"
