@frame
Feature: The global search, the theme of the user menu, and the tenants of a panel
  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: The global search finds records of several resources, and opens one
    When I go to "/"
    And I search the panel for "Webship Test"
    Then the global search should find "Webship Test Kettle"
    And the global search should find "Webship Test Lantern"
    And the global search should find "WS-TEST-0001"
    And the global search should show the group "products"
    And the global search should not find "Webship Brand Alpha"
    When I open "Webship Test Kettle" from the global search
    Then the page heading should be "Edit Webship Test Kettle"

  Scenario: A global search that finds nothing
    When I go to "/"
    And I search the panel for "no record of the app has this name"
    Then the global search should find nothing

  Scenario: The theme switched from the user menu, and back to the system's
    When I go to "/"
    Then the admin theme should be "system"
    When I switch the admin theme to "dark"
    Then the admin theme should be "dark"
    And the page should be shown in the dark appearance
    When I switch the admin theme to "light"
    Then the admin theme should be "light"
    And the page should be shown in the light appearance
    When I switch the admin theme to "system"
    Then the admin theme should be "system"

  @tenancy
  Scenario: A panel with tenants: the current one, and a switch to the other
    When I go to "/app"
    Then the current tenant should be "Webship Team"
    And the tenant menu should offer "Webship Second Team"
    And the tenant menu should offer "New team"
    And the tenant menu should not offer "Webship Team"
    When I switch the current tenant to "Webship Second Team"
    Then the current tenant should be "Webship Second Team"
    When I switch the current tenant to "Webship Team"
    Then the current tenant should be "Webship Team"
