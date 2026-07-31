@bdd @admin @monitoring
Feature: User administration and operational monitoring
  Administrators must manage functional-area access and inspect current operational evidence.

  Background:
    Given an authenticated administrator

  @users
  Scenario: Create a restricted test user
    Given username "qa_restricted_user"
    And email "qa_restricted_user@example.org"
    And only Local Catalogue access is selected
    When the administrator creates the user
    Then the user is active
    And only Local Catalogue access is displayed

  @users @rbac
  Scenario: Update functional-area permissions
    Given an active restricted test user
    When the administrator grants Catalogue Registry and Harvest access
    Then the updated functional areas are displayed
    And the change is written to the administrative audit log

  @monitoring @smoke
  Scenario: Display current module status
    When the administrator opens Monitoring
    Then SchemaRegistry, CatalogueRegistry and Harvester have explicit status
    And AdminTools, Auth and LocalCatalogue have explicit status
    And each module has a last-seen timestamp

  @monitoring
  Scenario: Refresh monitoring statistics
    Given monitoring data has a generated timestamp
    When the administrator refreshes monitoring
    Then a new generated timestamp is displayed
    And user, session and activity counters are displayed

  @monitoring @audit
  Scenario: Filter and export the recent administrative audit log
    Given recent audit events exist
    When the administrator filters events by severity
    Then only matching events are displayed
    When the administrator exports JSON
    Then the export contains the filtered events

