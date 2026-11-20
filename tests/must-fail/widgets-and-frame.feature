@must-fail
Feature: Assertions that must fail: the widgets, the view pages and the frame of the panel
  Each scenario asserts something that is not true on the test app. Its steps before the last one
  pass; the last one must fail, with the message its description announces and a hint. The theme and
  the tenant are read, never switched.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: A value a stat does not read
    Fails with: The stat "Revenue / Customer" reads "
    When I open "Shop Dashboard" from the sidebar
    Then the stat "Revenue / Customer" should read "no value of the app"

  Scenario: A widget the page does not show
    Fails with: Expected the page to show the widget "Monthly Revenue". Its widgets:
    When I open "Shop Dashboard" from the sidebar
    Then the page should show the widget "Monthly Revenue"

  Scenario: A chart the page does not have
    Fails with: The page has no chart "Monthly Revenue". Its charts: "Orders Year-over-Year", "Customer Growth"
    When I open "Shop Dashboard" from the sidebar
    Then the "Monthly Revenue" chart should be drawn

  Scenario: A record a table widget does not list
    Fails with: The "Flagged Orders" widget does not list "WS-NOT-AN-ORDER".
    When I open "Shop Dashboard" from the sidebar
    Then the "Flagged Orders" widget should list "WS-NOT-AN-ORDER"

  Scenario: An entry of a view page that reads something else
    Fails with: The "Title" entry reads "Webship test post", not "Another title".
    Given I am on the "Posts" list
    When I search the list for "Webship test post"
    And I open "Webship test post" from the list
    Then the "Title" entry should read "Another title"

  Scenario: Another page of the record taken for the current one
    Fails with: Expected the "Comments" page of the record on screen. The current one: "View".
    Given I am on the "Posts" list
    When I search the list for "Webship test post"
    And I open "Webship test post" from the list
    Then the "Comments" page of the record should be the current one

  Scenario: A global search said to find nothing, that finds records
    Fails with: Expected the global search to find nothing, but it found: "Webship Test Kettle"
    When I go to "/"
    And I search the panel for "Webship Test Kettle"
    Then the global search should find nothing

  Scenario: A record a global search does not find
    Fails with: Expected the global search to find "Webship Test Kettle". It found: (none)
    When I go to "/"
    And I search the panel for "no record of the app has this name"
    Then the global search should find "Webship Test Kettle"

  Scenario: A notification the drawer does not list
    Fails with: Expected the notifications drawer to list "Webship notification that was never sent". It lists:
    When I go to "/"
    And I open the notifications drawer
    Then the notifications drawer should list "Webship notification that was never sent"

  Scenario: A count of unread notifications the button does not show
    Fails with: The notifications button shows
    When I go to "/"
    Then the notifications button should show 42 unread

  Scenario: A theme that was not chosen
    Fails with: Expected the "dark" theme, but the user menu marks "system"
    When I go to "/"
    Then the admin theme should be "dark"

  Scenario: A group the results of a global search do not have
    Fails with: Expected the results of the global search to have the group "orders". Its groups: "products".
    When I go to "/"
    And I search the panel for "Webship Test Kettle"
    Then the global search should show the group "orders"

  @tenancy
  Scenario: Another tenant taken for the current one
    Fails with: The current tenant is "Webship Team", not "Webship Second Team".
    When I go to "/app"
    Then the current tenant should be "Webship Second Team"

  @tenancy
  Scenario: A tenant the menu does not offer
    Fails with: Expected the tenant menu to offer "Webship Third Team". It offers:
    When I go to "/app"
    Then the tenant menu should offer "Webship Third Team"
