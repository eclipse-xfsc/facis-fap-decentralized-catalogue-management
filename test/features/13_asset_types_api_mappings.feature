@bdd @catalogue-registry @api-mapping
Feature: Asset types and remote API mappings
  Harvesting by type must use managed local asset types and explicit remote request mappings.

  Background:
    Given an authenticated user with Catalogue Registry update access

  @asset-type
  Scenario: Create a local asset type
    Given asset type name "QA Public Dataset"
    And description "Public non-confidential test dataset"
    When the asset type is saved
    Then it appears in Asset Types

  @asset-type @validation
  Scenario: Prevent an invalid duplicate asset type
    Given asset type "QA Public Dataset" already exists
    When the user attempts to create the same unique type again
    Then an explicit validation error is displayed
    And only one unique type remains

  @api-mapping
  Scenario: Create a manual GET API mapping
    Given an active public REST catalogue
    And local type "dataset"
    And remote type "Dataset"
    When the user saves method "GET" and path "/datasets"
    Then the mapping is active
    And it is identified as manually generated

  @api-mapping @ai
  Scenario: Generate an API mapping with AI
    Given an active provider and API-mapping prompt
    And an active remote catalogue and local asset type
    When the user generates an API mapping with AI
    Then a method and path are proposed
    And the user can review them before saving

  @api-mapping @harvest
  Scenario: Use an active API mapping during typed harvest
    Given an active mapping for local type "dataset"
    When a harvest scope selects all assets of type "dataset"
    Then the configured HTTP method and path are executed
    And the run evidence identifies the applied API mapping

