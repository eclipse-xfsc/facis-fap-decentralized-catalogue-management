@bdd @harvest @catalogue
Feature: Catalogue registration and harvesting
  Registered catalogue protocols must execute against real sources and report truthful results.

  Background:
    Given an authenticated user with Catalogue Registry and Harvest access

  @oai-pmh @e2e
  Scenario: Harvest an OAI-PMH catalogue using resumption-token paging
    Given an OAI-PMH catalogue with a working ListRecords endpoint
    And a metadata prefix is configured
    And the maximum page count is 2
    When the catalogue is harvested
    Then the harvest completes successfully
    And exactly 2 OAI-PMH pages are requested
    And a resumption token is followed
    And the imported asset count is greater than 0
    And the imported assets are visible in the Local Catalogue

  @sparql @e2e
  Scenario: Harvest a SPARQL query-interface catalogue
    Given a SPARQL catalogue with a valid SELECT query
    When the catalogue is harvested
    Then the endpoint returns one or more bindings
    And each accepted binding is converted into a local asset
    And the executed query and binding count are retained as run evidence

  @negative @error-handling
  Scenario: An unreachable endpoint produces a failed harvest
    Given a catalogue configured with an unreachable endpoint
    When the catalogue is harvested
    Then the run status is "Failed"
    And the imported asset count is 0
    And the error count is greater than 0
    And the diagnostics identify the failed stage and endpoint
    And no fabricated asset or success audit record is created

  @negative @validation
  Scenario: Invalid catalogue configuration is rejected before harvesting
    Given a catalogue is missing a required protocol field
    When a user attempts to start its harvest
    Then the harvest is not started
    And the response identifies the invalid field
    And no successful run record is created

