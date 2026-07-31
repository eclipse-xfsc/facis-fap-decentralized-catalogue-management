@bdd @schema-registry @transformation
Feature: Transformation execution, versioning and audit integrity
  Transformations must be reproducible, validated and traceable.

  Background:
    Given an authenticated user with Schema Registry access

  @deterministic @e2e
  Scenario: Deterministic mapping creates a transformed representation
    Given an active source schema, target schema and deterministic mapping
    And a source asset conforming to the source schema
    When the transformation is executed
    Then the transformed representation is not null
    And it identifies the mapping version used
    And SHACL validation returns an explicit result

  @prompt-versioning
  Scenario: Updating a prompt preserves its previous version
    Given prompt version "1.0" exists
    When version "1.1" is created from that prompt
    Then both version "1.0" and version "1.1" are available
    And version "1.0" is unchanged
    And the new version retains its name, author and status

  @audit @e2e
  Scenario: A successful transformation creates a complete chained audit record
    Given a valid catalogue asset is transformed
    When the transformation succeeds
    Then its audit record contains the catalogue identifier
    And its audit record contains the asset identifier
    And its audit record contains the mapping or prompt version
    And its audit record contains a sequence number, previous hash and record hash
    And integrity verification reports the new chain as valid

  @audit @manual-db @tamper
  Scenario: Audit verification detects a modified chained record
    Given a valid audit chain with at least 3 new records
    When an authorized tester modifies a hashed field in the third MongoDB record
    Then integrity verification reports the chain as broken
    And the first broken sequence is 3
    And the expected and stored hashes are different

