@bdd @schema-registry @versioning
Feature: Local and remote schema asset management
  Schema definitions must be stored, searchable and versioned as managed assets.

  Background:
    Given an authenticated user with Schema Registry access

  @local-schema
  Scenario: Create a local schema version
    Given local schema name "QA Public Dataset Schema"
    And version "1.0.0"
    And a non-confidential schema definition
    When the user saves the local schema
    Then it appears in Local Schema
    And version "1.0.0" is active

  @local-schema @versioning
  Scenario: Preserve previous local schema versions
    Given local schema version "1.0.0" exists
    When version "1.1.0" is created
    Then both versions are listed
    And the previous definition is unchanged

  @remote-schema
  Scenario: Register a JSON remote schema
    Given remote schema name "QA Public Remote Dataset"
    And format "json-schema"
    And version "1.0.0"
    When the user registers the remote schema
    Then its format, version and status are displayed

  @remote-schema @shacl
  Scenario: Register a SHACL remote schema
    Given a valid non-confidential SHACL shape
    When the user registers it as a remote schema
    Then format "shacl" is displayed
    And the stored content can be reopened

  @referential-integrity @regression
  Scenario: Deleted catalogue references are not presented as usable mappings
    Given a remote schema references a deleted catalogue
    When Remote Schema is displayed
    Then the reference is identified as deleted
    And it cannot be selected for a new active mapping

