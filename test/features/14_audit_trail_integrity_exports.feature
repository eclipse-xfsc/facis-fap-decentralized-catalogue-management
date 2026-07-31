@bdd @audit @integrity
Feature: Transformation audit filtering, integrity and export
  Audit evidence must be searchable, exportable and protected by a verifiable hash chain.

  Background:
    Given an authenticated user with Schema Registry read access
    And new hash-chained audit records exist

  @integrity @smoke
  Scenario: Verify the current audit chain
    When the user verifies integrity
    Then the result is "Chain verified"
    And the verified count is greater than 0
    And legacy records are counted separately as unverified
    And the chain algorithm and verification timestamp are displayed

  @filters
  Scenario: Filter audit records by catalogue and status
    When the user selects a catalogue
    And selects status "Success"
    And applies the filters
    Then every displayed row belongs to that catalogue
    And every displayed row has the selected status

  @details
  Scenario: View complete audit record details
    Given a new verified audit row
    When the user opens its details
    Then remote and local asset identifiers are displayed
    And catalogue ID and strategy are displayed
    And sequence, previous hash and record hash are displayed

  @export
  Scenario Outline: Export audit evidence
    Given an audit filter has been applied
    When the user exports "<format>"
    Then the downloaded file contains the filtered audit records
    And it includes raw catalogue and asset identifiers
    And it includes sequence, previous hash and record hash

    Examples:
      | format |
      | CSV    |
      | JSON   |

  @manual-db @tamper
  Scenario: Detect a gap or duplicate in the audit sequence
    Given a controlled test database with at least 3 chained records
    When an authorized tester deletes a middle sequence or duplicates its sequence number
    Then integrity verification reports the chain as broken
    And the first affected sequence is identified

