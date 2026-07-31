@bdd @local-catalogue @search
Feature: Unified local catalogue browsing and export
  Harvested assets must be searchable and filterable in one shared catalogue view.

  Background:
    Given an authenticated user with Local Catalogue read access
    And harvested assets exist

  @smoke
  Scenario: Search for an exact harvested asset
    Given a harvested asset named "Q42"
    When the user searches for "Q42"
    Then exactly the matching asset is displayed
    And its source catalogue is displayed
    And its integration status is "Active"

  @filters
  Scenario: Combine catalogue, type and integration-status filters
    When the user selects a source catalogue
    And selects an asset type
    And selects integration status "Active"
    And runs the search
    Then every displayed row matches all selected filters

  @filters
  Scenario: Clear all local catalogue filters
    Given search text and one or more filters are active
    When the user clears the filters
    Then the search text is empty
    And every filter returns to its default value
    And the unfiltered asset count is restored

  @export
  Scenario: Export the currently filtered local catalogue
    Given a catalogue filter returns at least one asset
    When the user exports CSV
    Then a CSV file is produced
    And it contains only assets in the current result set
    And it includes asset, type, catalogue and status columns

  @shared-view @rbac
  Scenario: Local catalogue data remains a unified view
    Given two authorized users can read the Local Catalogue
    And one user performs a successful harvest
    When the other user searches for an imported asset
    Then the imported asset is visible

