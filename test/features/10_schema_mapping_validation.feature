@bdd @schema-mapping @validation
Feature: Schema mapping strategies and SHACL validation
  Mappings must bind remote and local schemas to an explicit transformation strategy.

  Background:
    Given an authenticated user with Schema Registry update access
    And active local and remote schemas exist

  Scenario Outline: Create a supported schema mapping strategy
    Given a remote catalogue and remote schema
    And a target local schema
    When the user creates a mapping using "<strategy>"
    Then the mapping is listed with strategy "<strategy>"

    Examples:
      | strategy          |
      | JSON Field Mapping |
      | AI-driven          |
      | Hybrid AI Mapping  |
      | Deterministic RDF  |

  @rdf
  Scenario: Configure deterministic RDF rules
    Given a mapping using "Deterministic RDF"
    When the user opens RDF Rules
    And saves valid namespace and predicate rules
    Then the rules remain associated with the mapping

  @shacl
  Scenario: Associate SHACL validation with a mapping
    Given a valid SHACL shape is registered
    When the user associates the shape with a schema mapping
    Then the mapping shows a non-zero SHACL count

  @filtering
  Scenario: Filter mappings by catalogue and schema
    Given mappings exist for multiple catalogues
    When the user selects a remote catalogue, remote schema and local schema
    Then only matching mappings are displayed

  @negative
  Scenario: Prevent an incomplete schema mapping
    Given no target local schema is selected
    When the user attempts to save a mapping
    Then saving is disabled or rejected
    And no incomplete mapping is created

