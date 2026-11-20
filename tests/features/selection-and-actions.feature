@actions
Feature: Selected rows, bulk actions, row actions, modals and slide-overs
  The demo refuses to delete records from its tables: its delete actions answer with a warning
  notification and delete nothing. The order of the test records goes from new to shipped, and its
  form puts it back to new.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: Rows selected one by one and by page, and a bulk action confirmed
    Given I am on the "Products" list
    When I search the list for "Webship Test"
    And I select "Webship Test Kettle" in the list
    Then the selection should read "1 record selected"
    When I select all products on the page
    Then the selection should read "3 records selected"
    And the bulk actions should offer "Delete selected"
    And the bulk actions should offer "Toggle visibility"
    And the bulk actions should not offer "Force delete selected"
    When I run the bulk action "Delete selected"
    Then the "Delete selected Products" modal should be open
    And the modal should ask "Are you sure you would like to do this?"
    When I confirm the modal
    Then no modal should be open
    And I should see the warning notification "Now, now, don't be cheeky, leave some records for others to play with!"
    And the list should count 3 products

  Scenario: A confirmation cancelled leaves everything as it was
    Given I am on the "Products" list
    When I search the list for "Webship Test Kettle"
    And I select all products on the page
    And I run the bulk action "Delete selected"
    Then the "Delete selected Products" modal should be open
    When I cancel the modal
    Then no modal should be open
    And I should not see a notification
    And the list should count 1 product

  Scenario: The actions of a row follow the state of its record, through a slide-over
    Given I am on the "Orders" list
    When I search the list for "WS-TEST-0001"
    Then the "WS-TEST-0001" row should offer the "Process" action
    And the "WS-TEST-0001" row should not offer the "Ship" action
    When I run the "Process" action on the "WS-TEST-0001" row
    Then I should see the success notification "Order is now processing"
    And the "WS-TEST-0001" row should show "Processing" in the "Status" column
    When I run the "Ship" action on the "WS-TEST-0001" row
    Then the "Ship" slide-over should be open
    When I set "Shipping notes" to "Left at the front desk."
    And I press "Ship & notify customer" in the modal footer
    Then I should see the success notification "Order shipped & customer notified"
    # The button of the footer ships the order and leaves the slide-over open.
    When I close the open modal
    Then the "Ship" slide-over should be closed
    And the "WS-TEST-0001" row should show "Shipped" in the "Status" column
    And the "WS-TEST-0001" row should offer the "Deliver" action
    When I open "WS-TEST-0001" from the list
    And I set "Status" to "New"
    And I save the form
    Then I should see the success notification "Saved"
    And "Status" should be set to "New"

  Scenario: A modal with a form: refused while a field is empty, then sent
    Given I am on the "Customers" list
    When I search the list for "Wendy Webship"
    And I run the "Send email" action on the "Wendy Webship" row
    Then the "Send email" modal should be open
    And "To" should be set to "wendy.webship@example.com"
    And the "To" field should be read only
    When I confirm the modal
    Then the "Subject" field should block submission as required
    And the "Send email" modal should be open
    When I set "Subject" to "Webship test subject"
    And I set "Body" to "A message typed in the editor."
    And I confirm the modal
    Then no modal should be open
    And I should see the success notification "Email sent to Wendy Webship"

  Scenario: A modal closed with its close button
    Given I am on the "Customers" list
    When I search the list for "Wendy Webship"
    And I run the "Send email" action on the "Wendy Webship" row
    Then the "Send email" modal should be open
    And I should see "Send email" in the modal
    When I close the open modal
    Then the "Send email" modal should be closed
