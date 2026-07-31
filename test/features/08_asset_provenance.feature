@bdd @provenance @lifecycle
Feature: Asset provenance and lifecycle evidence
  Imported assets must retain enough provenance to explain their source and treatment.

  Background:
    Given an authenticated user with Local Catalogue read access
    And provenance records exist

  Scenario: Display provenance summary totals
    When the user opens Local Catalogue Provenance
    Then total imported assets are displayed
    And linked catalogue and harvest run counts are displayed
    And mapped and unmapped provenance counts are displayed

  @filters
  Scenario: Filter provenance by strategy
    When the user selects strategy "Deterministic RDF"
    Then every displayed provenance row uses deterministic mapping

  @filters
  Scenario: Filter provenance by schema mapping status
    When the user selects schema mapped "Yes"
    Then every displayed provenance row identifies a schema mapping

  @traceability
  Scenario: Provenance identifies lifecycle handling
    Given a newly harvested asset
    When its provenance record is displayed
    Then it identifies the source catalogue
    And it identifies the harvest date and strategy
    And it identifies update handling
    And it identifies deletion handling

  @regression
  Scenario: New provenance records do not contain unexplained blanks
    Given a harvest completes after provenance tracking is enabled
    When the new provenance rows are displayed
    Then source catalogue is not blank
    And harvest date is not blank
    And the strategy is an explicit supported value

