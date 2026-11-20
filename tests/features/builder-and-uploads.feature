@form
Feature: The blocks of a builder, and files uploaded to a form
  Nothing here is saved: the blocks and the files go before the form is left.

  Background:
    Given I am a logged in user with the "administrator" user

  Scenario: Blocks added, moved and removed in the plan of a project
    Given I am on the "Projects" list
    When I search the list for "Webship Test Project"
    And I open "Webship Test Project" from the list
    And I run the "Edit" action of the page
    And I open the "Plan" tab
    Then "Plan" should have 0 rows
    When I add the "Milestone" block to "Plan"
    And I set "Title" to "First milestone" in row 1 of "Plan"
    And I add the "Checkpoint" block to "Plan"
    Then the rows of "Plan" should be "Milestone" and "Checkpoint"
    When I move row 2 of "Plan" up
    Then the rows of "Plan" should be "Checkpoint" and "Milestone"
    When I remove row 1 of "Plan"
    Then the rows of "Plan" should be "Milestone"
    And "Title" should be set to "First milestone" in row 1 of "Plan"
    When I remove row 1 of "Plan"
    Then "Plan" should have 0 rows
    When I add the "Task group" block to "Plan"
    And I set "Title" to "Webship task group" in row 1 of "Plan"
    And I set "Tasks" to "Write the plan, Review the plan" in row 1 of "Plan"
    Then "Tasks" should be set to "Write the plan, Review the plan" in row 1 of "Plan"
    When I set "Tasks" to "Review the plan" in row 1 of "Plan"
    Then "Tasks" should be set to "Review the plan" in row 1 of "Plan"
    When I remove row 1 of "Plan"
    Then "Plan" should have 0 rows

  Scenario: A file of a type the field refuses, then one it takes, both removed
    Given I am on the "Products" list
    When I search the list for "Webship Test Kettle"
    And I open "Webship Test Kettle" from the list
    And I upload "test-panel-image.png" to the "Images" field
    Then the "Images" field should refuse the file "test-panel-image.png" with "File of invalid type"
    When I remove the file "test-panel-image.png" from the "Images" field
    And I upload "test-panel-photo.jpg" to the "Images" field
    Then the "Images" field should hold the file "test-panel-photo.jpg"
    When I remove the file "test-panel-photo.jpg" from the "Images" field
    Then the "Images" field should not hold the file "test-panel-photo.jpg"
